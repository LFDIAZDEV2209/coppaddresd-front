"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getDemoCredentials } from "@/lib/api/auth-service";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Mail,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SlideToConfirm } from "@/components/brand/slide-to-confirm";
import { useT } from "@/providers/i18n-provider";

/**
 * Banner de sesión expirada: se muestra cuando se llega al login con
 * `?expired=1` (cierre por inactividad o refresh token inválido).
 * Se aísla en Suspense porque useSearchParams requiere boundary en
 * prerender estático.
 */
function ExpiredBanner() {
  const searchParams = useSearchParams();
  const t = useT();

  if (searchParams.get("expired") !== "1") return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-center gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-[13px] text-warning-foreground"
    >
      <AlertTriangle className="size-4 shrink-0" />
      {t("Tu sesión expiró. Inicia sesión nuevamente para continuar.")}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: sessionLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useT();

  // Si ya hay una sesión activa (restaurada por cookie al cargar), no tiene
  // sentido ver el login: redirige al dashboard.
  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace("/dashboard");
    }
  }, [sessionLoading, user, router]);

  // Lógica de autenticación intacta: solo cambió el gatillo (slide o Enter).
  const doLogin = async () => {
    setError("");
    setSubmitting(true);

    const result = await login(email, password, remember);

    if (!result.success) {
      setError(result.error || "Error inesperado. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin();
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="grid min-h-dvh w-full overflow-x-hidden lg:grid-cols-[minmax(0,520px)_1fr]">
      {/* ─── Izquierda: formulario ─── */}
      <div className="relative flex flex-col bg-background px-6 py-7 sm:px-10 lg:px-14">
        {/* Idioma (esquina) */}
        <LanguageToggle className="absolute right-6 top-8 z-10 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:right-10" />

        {/* Marca centrada (línea splash Antares) */}
        <Image
          src="/LogoConLetras.png"
          alt="COPP-ADRESD"
          width={816}
          height={519}
          priority
          className="mx-auto h-14 w-auto"
        />

        {/* Contenido centrado verticalmente */}
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="stagger-children mx-auto flex w-full max-w-[400px] flex-col">
            {/* Titular display (línea Antares: gris + navy bold) */}
            <h1 className="font-heading text-[clamp(30px,4.2vw,38px)] leading-[1.06] tracking-tight">
              <span className="block font-medium text-slate-500">
                {t("Transforma")}
              </span>
              <span className="block font-bold text-brand-navy">
                {t("tu clínica")}
              </span>
            </h1>
            <p className="mt-4 max-w-[40ch] text-[14.5px] leading-relaxed text-secondary-foreground">
              {t(
                "Pacientes, programas y agentes de IA en una sola consola clínica.",
              )}
            </p>

            {/* Sesión expirada (por inactividad o cookie corrupta) */}
            <Suspense fallback={null}>
              <ExpiredBanner />
            </Suspense>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <Label
                  htmlFor="email"
                  className="text-[13px] font-semibold text-foreground"
                >
                  {t("Correo electrónico")}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nombre@clinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-border/80 bg-card pr-3.5 pl-10 text-[14.5px] shadow-none"
                    autoComplete="email"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-semibold text-foreground"
                >
                  {t("Contraseña")}
                </Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-border/80 bg-card pr-11 pl-10 text-[14.5px] shadow-none"
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-brand-navy cursor-pointer"
                    aria-label={
                      showPassword
                        ? t("Ocultar contraseña")
                        : t("Mostrar contraseña")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-2.5 pt-0.5">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <span className="text-[13px] text-muted-foreground">
                  {t("Recordar sesión")}
                </span>
              </label>

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl bg-destructive-soft px-3.5 py-3 text-[13px] text-destructive"
                >
                  <AlertTriangle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* CTA: desliza para iniciar sesión (Enter también funciona) */}
              <SlideToConfirm
                label={t("Comencemos")}
                busyLabel={t("Verificando credenciales...")}
                busy={submitting}
                onConfirm={() => void doLogin()}
                className="mt-1"
              />
            </form>

            {/* Credenciales demo — solo en desarrollo */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4">
                <HeartPulse className="mt-0.5 size-5 shrink-0 text-brand-teal" />
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-semibold text-foreground">
                    {t("Credenciales de demostración")}
                  </span>
                  {getDemoCredentials().map((cred) => (
                    <button
                      key={cred.email}
                      type="button"
                      onClick={() => fillDemo(cred.email, cred.password)}
                      className="group flex min-w-0 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left text-[11.5px] text-muted-foreground transition-colors hover:text-brand-navy"
                    >
                      <CheckCircle2 className="size-3 shrink-0 text-brand-teal" />
                      <span className="truncate font-mono">{cred.email}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-mono">{cred.password}</span>
                      <span className="ml-auto rounded-md bg-secondary-soft px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {cred.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie de seguridad */}
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-brand-teal" />
          {t("Conexión segura con cifrado de extremo a extremo")}
        </div>
      </div>

      {/* ─── Derecha: panel navy showcase (solo desktop) ─── */}
      <div className="relative hidden overflow-hidden bg-brand-navy lg:flex lg:flex-col">
        {/* Fondo compuesto: gradiente profundo + anillos concéntricos (motivo
            ring de la marca) + auroras teal/azul */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(165deg,#1c3a6e_0%,#142855_48%,#0b1a3d_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 -right-24 size-[560px] rounded-full border border-white/6"
        >
          <div className="absolute inset-10 rounded-full border border-white/5">
            <div className="absolute inset-10 rounded-full border border-teal-400/10" />
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-[420px] rounded-full bg-brand-teal/20 blur-[120px]" />
        <div className="pointer-events-none absolute top-10 right-1/4 size-[360px] rounded-full bg-brand-blue-mid/15 blur-[110px]" />

        {/* Marca */}
        <div className="relative z-10 flex items-center justify-center gap-3.5 px-12 pt-10">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/10">
            <Image
              src="/LogoIndividual.png"
              alt="COPP-ADRESD"
              width={197}
              height={197}
              className="size-9 object-contain"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-lg font-bold tracking-tight text-white">
              COPP-ADRESD
            </span>
            <span className="text-[10px] font-semibold tracking-[0.14em] text-brand-blue-soft/90 uppercase">
              {t("Comprehensive Obesity Prevention Program")}
            </span>
          </div>
        </div>

        {/* Showcase: tarjeta fotográfica + métricas flotantes integradas */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-12 py-8">
          <div className="relative w-full max-w-[480px]">
            {/* Anillos decorativos grandes (motivo circular de la marca) */}
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/8"
            />
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/6"
            />

            {/* Foto principal — protagonista del panel */}
            <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] shadow-2xl shadow-black/45">
              <Image
                src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?q=80&w=1400&auto=format&fit=crop"
                alt={t("Equipo clínico de Copp Adresd")}
                fill
                sizes="(min-width: 1024px) 480px, 0px"
                className="object-cover saturate-[0.88]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/15 to-brand-navy/30" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-md">
                  <h2 className="font-heading text-[16.5px] font-bold tracking-tight text-white">
                    {t("Plataforma de salud integral")}
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/75">
                    {t(
                      "Administración clínica para el seguimiento integral de tus pacientes.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas flotantes del producto (glass pills integradas) */}
            <div className="absolute top-6 -left-8 flex items-center gap-2.5 rounded-full border border-white/15 bg-white/12 py-2 pr-5 pl-2 shadow-xl shadow-black/25 backdrop-blur-md">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-teal">
                <UsersRound className="size-4 text-white" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-heading text-[13px] font-bold text-white">
                  12.8K
                </span>
                <span className="text-[10.5px] text-white/70">
                  {t("Pacientes")}
                </span>
              </span>
            </div>

            <div className="absolute -top-5 -right-3 flex items-center gap-2.5 rounded-full border border-white/15 bg-white/12 py-2 pr-5 pl-2 shadow-xl shadow-black/25 backdrop-blur-md">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-teal">
                <Bot className="size-4 text-white" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-heading text-[13px] font-bold text-white">
                  24
                </span>
                <span className="text-[10.5px] text-white/70">
                  {t("Agentes IA activos")}
                </span>
              </span>
            </div>

            <div className="absolute -bottom-6 -right-6 flex items-center gap-2.5 rounded-full border border-white/15 bg-white/12 py-2 pr-5 pl-2 shadow-xl shadow-black/25 backdrop-blur-md">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-teal">
                <Activity className="size-4 text-white" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-heading text-[13px] font-bold text-white">
                  99.8%
                </span>
                <span className="text-[10.5px] text-white/70">
                  {t("Disponibilidad")}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Capacidades de la plataforma: barra integrada al showcase */}
        <div className="relative z-10 px-12 pb-9">
          <div className="mx-auto grid max-w-[480px] grid-cols-4 divide-x divide-white/8 rounded-2xl border border-white/10 bg-white/6 backdrop-blur-sm">
            {[
              { icon: UsersRound, label: t("Pacientes") },
              { icon: CalendarDays, label: t("Agenda") },
              { icon: Bot, label: t("Agentes IA") },
              { icon: MessageCircle, label: t("Chat") },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex flex-col items-center gap-2 px-2 py-4 text-center"
              >
                <chip.icon
                  className="size-[18px] text-brand-blue-soft"
                  aria-hidden="true"
                />
                <span className="text-[11px] font-medium text-white/80">
                  {chip.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
