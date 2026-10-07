"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  acceptInvitation,
  validateInvitation,
  type InvitationValidation,
} from "@/lib/api/invitation-service";
import { ApiError } from "@/lib/api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordChecklist } from "@/features/auth-common/components/password-checklist";
import { validatePassword } from "@/features/auth-common/utils/validation";
import { useT } from "@/providers/i18n-provider";

type Phase = "loading" | "invalid" | "ready" | "submitting" | "done";

function InvitationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const t = useT();

  const [phase, setPhase] = useState<Phase>(token ? "loading" : "invalid");
  const [validation, setValidation] = useState<InvitationValidation | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : t("Falta el enlace de invitación. Revisa el correo que recibiste."),
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await validateInvitation(token);
        if (cancelled) return;
        if (!result.valid) {
          setPhase("invalid");
          setError(result.error ?? t("La invitación no es válida."));
        } else {
          setValidation(result);
          setPhase("ready");
        }
      } catch {
        if (!cancelled) {
          setPhase("invalid");
          setError(t("No se pudo validar la invitación. Intenta nuevamente."));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  // Validación en vivo contra la política del backend (misma que el alta).
  const passwordErrors = validatePassword(password);
  const passwordValid = passwordErrors.length === 0;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    phase === "ready" && passwordValid && confirm.length > 0 && !mismatch;
  const isSubmitting = phase === "submitting";

  const submit = async () => {
    if (!passwordValid || confirm.length === 0 || mismatch) return;

    setPhase("submitting");
    setError(null);
    try {
      await acceptInvitation(token, password);
      setPhase("done");
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setPhase("ready");
      setError(
        err instanceof ApiError
          ? err.message
          : t("No se pudo completar el acceso. Intenta nuevamente."),
      );
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <KeyRound className="size-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-brand-navy">
            {t("Completa tu acceso")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Establece tu contraseña para entrar a la plataforma.")}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          {phase === "loading" && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">{t("Validando invitación...")}</span>
            </div>
          )}

          {phase === "invalid" && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent/40"
              >
                {t("Volver al inicio de sesión")}
              </Link>
            </div>
          )}

          {(phase === "ready" || phase === "submitting") && (
            <div>
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/70 bg-accent/40 p-3">
                <ShieldCheck className="size-5 shrink-0 text-brand-teal" />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {validation?.firstName} {validation?.lastName}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {validation?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-[13px] font-semibold text-foreground"
                  >
                    {t("Nueva contraseña")}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("Mínimo 8 caracteres")}
                      className="h-11 rounded-xl border-border/80 bg-card pr-10 pl-10 text-[14.5px] shadow-none"
                      aria-invalid={password.length > 0 && !passwordValid}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-brand-navy"
                      aria-label={
                        show ? t("Ocultar contraseña") : t("Mostrar contraseña")
                      }
                    >
                      {show ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2">
                    <PasswordChecklist password={password} errors={passwordErrors} />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm"
                    className="mb-1.5 block text-[13px] font-semibold text-foreground"
                  >
                    {t("Confirmar contraseña")}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={show ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder={t("Repite la contraseña")}
                      className="h-11 rounded-xl border-border/80 bg-card pl-10 text-[14.5px] shadow-none"
                      aria-invalid={mismatch}
                      autoComplete="new-password"
                    />
                  </div>
                  {mismatch && (
                    <p className="mt-1.5 text-[12px] text-destructive">
                      {t("Las contraseñas no coinciden.")}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive-soft px-3.5 py-3 text-[13px] text-destructive">
                    <AlertTriangle className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || isSubmitting}
                  className="h-11 w-full rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("Establecer contraseña e iniciar")
                  )}
                </Button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="py-6 text-center">
              <ShieldCheck className="mx-auto mb-3 size-10 text-brand-teal" />
              <p className="text-sm font-semibold text-foreground">
                {t("¡Acceso completado!")}
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {t("Redirigiendo al inicio de sesión...")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitacionesPage() {
  return (
    <Suspense fallback={null}>
      <InvitationPageContent />
    </Suspense>
  );
}
