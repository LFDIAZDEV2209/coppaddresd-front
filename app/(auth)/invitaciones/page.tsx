"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { acceptInvitation, validateInvitation, type InvitationValidation } from "@/lib/api/invitation-service";
import { ApiError } from "@/lib/api/http";
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

  const submit = async () => {
    if (password.length < 8) {
      setError(t("La contraseña debe tener al menos 8 caracteres."));
      return;
    }
    if (password !== confirm) {
      setError(t("Las contraseñas no coinciden."));
      return;
    }

    setPhase("submitting");
    setError(null);
    try {
      await acceptInvitation(token, password);
      setPhase("done");
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setPhase("ready");
      setError(
        err instanceof ApiError ? err.message : t("No se pudo completar el acceso. Intenta nuevamente."),
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B2B4A] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <KeyRound className="size-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("Completa tu acceso")}</h1>
          <p className="mt-1 text-sm text-white/65">
            {t("Establece tu contraseña para entrar a la plataforma.")}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          {phase === "loading" && (
            <div className="flex items-center justify-center gap-2 py-8 text-white/70">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">{t("Validando invitación...")}</span>
            </div>
          )}

          {phase === "invalid" && (
            <div className="py-4 text-center">
              <p className="text-sm text-white/85">{error}</p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {t("Volver al inicio de sesión")}
              </Link>
            </div>
          )}

          {phase === "ready" && (
            <div>
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-500/10 p-3">
                <ShieldCheck className="size-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-[13px] font-semibold text-white">
                    {validation?.firstName} {validation?.lastName}
                  </p>
                  <p className="text-[11.5px] text-white/60">{validation?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-medium text-white/80">
                    {t("Nueva contraseña")}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("Mínimo 8 caracteres")}
                      className="h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3.5 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                      aria-label={show ? t("Ocultar contraseña") : t("Mostrar contraseña")}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-[12.5px] font-medium text-white/80">
                    {t("Confirmar contraseña")}
                  </label>
                    <input
                      id="confirm"
                      type={show ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder={t("Repite la contraseña")}
                      className="h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/60"
                    />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">{error}</p>
                )}

                <button
                  onClick={submit}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                  {t("Establecer contraseña e iniciar")}
                </button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="py-6 text-center">
              <ShieldCheck className="mx-auto mb-3 size-10 text-emerald-400" />
              <p className="text-sm font-semibold text-white">{t("¡Acceso completado!")}</p>
              <p className="mt-1 text-[12.5px] text-white/60">{t("Redirigiendo al inicio de sesión...")}</p>
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
