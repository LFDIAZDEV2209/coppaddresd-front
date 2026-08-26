"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getDemoCredentials } from "@/lib/api/auth-service";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  HeartPulse,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { cn } from "@/lib/utils";

/**
 * Banner de sesión expirada: se muestra cuando se llega al login con
 * `?expired=1` (cierre por inactividad o refresh token inválido).
 * Se aísla en Suspense porque useSearchParams requiere boundary en
 * prerender estático.
 */
function ExpiredBanner() {
  const searchParams = useSearchParams();

  if (searchParams.get("expired") !== "1") return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning-foreground"
    >
      <AlertTriangle className="size-4 shrink-0" />
      Tu sesión expiró. Inicia sesión nuevamente para continuar.
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

  // Si ya hay una sesión activa (restaurada por cookie al cargar), no tiene
  // sentido ver el login: redirige al dashboard.
  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace("/dashboard");
    }
  }, [sessionLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await login(email, password, remember);

    if (!result.success) {
      setError(result.error || "Error inesperado. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel — Form */}
      <div className="relative flex w-full max-w-[560px] flex-col justify-center overflow-hidden px-6 py-12 sm:px-10 lg:px-14">
        {/* Fondo decorativo sutil (familia Antares) */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 size-72 rounded-full bg-primary-soft blur-3xl" />
          <div className="absolute -right-32 bottom-0 size-80 rounded-full bg-success-soft blur-3xl" />
        </div>

        {/* Language Toggle */}
        <LanguageToggle className="absolute right-6 top-6 z-10 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:right-10" />

        {/* Brand */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm shadow-primary/30">
            CA
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-foreground">
              Copp Adresd
            </span>
            <span className="text-xs text-muted-foreground">
              Consola de administración
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-lg bg-primary-soft px-3 py-1.5">
          <ShieldCheck className="size-4 text-primary" />
          <span className="text-xs font-medium text-primary">
            Conexión segura · SSL/TLS
          </span>
        </div>

        {/* Title */}
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Lock className="size-5" />
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
            Acceso administrativo clínico
          </h1>
        </div>
        <p className="mb-8 max-w-[400px] text-[14px] leading-relaxed text-secondary-foreground">
          Gestiona pacientes, agentes de IA y programas de salud desde un
          entorno seguro.
        </p>

        {/* Security Indicators */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          {[
            { icon: Lock, label: "Datos cifrados", color: "text-success" },
            { icon: HeartPulse, label: "Monitoreo 24/7", color: "text-info" },
            { icon: Fingerprint, label: "2FA disponible", color: "text-primary" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <item.icon className={cn("size-3.5", item.color)} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Sesión expirada (por inactividad o cookie corrupta) */}
        <Suspense fallback={null}>
          <ExpiredBanner />
        </Suspense>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium">
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@coppaddresd.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-card pl-10"
                autoComplete="email"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-[13px] font-medium">
              Contraseña
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-card pr-10 pl-10"
                autoComplete="current-password"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <span className="text-[13px] text-muted-foreground">
                Recordar sesión
              </span>
            </label>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <UserRound className="size-3.5" />
              Acceso restringido
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive"
            >
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary-strong text-[14px] font-semibold shadow-sm shadow-primary/30 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verificando credenciales...
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Iniciar sesión segura
              </>
            )}
          </Button>
        </form>

        {/* Demo Credentials Card — solo en desarrollo */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 flex items-start gap-3 rounded-xl bg-primary-soft p-4">
            <HeartPulse className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold text-foreground">
                Credenciales de demostración
              </span>
              {getDemoCredentials().map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => fillDemo(cred.email, cred.password)}
                  className="flex items-center gap-2 text-[11.5px] text-muted-foreground hover:text-primary transition-colors text-left group cursor-pointer"
                >
                  <CheckCircle2 className="size-3 text-success group-hover:text-primary" />
                  <span className="font-mono">{cred.email}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="font-mono">{cred.password}</span>
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
                    {cred.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel — Image + Overlay Content */}
      <div className="hidden relative lg:flex lg:flex-1 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1638202993928-7267aad84c31?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Tecnología médica"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay Gradient (familia Antares: navy → azul) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--sidebar)]/95 via-[var(--sidebar-primary)]/90 to-primary/85" />
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 size-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-40 left-20 size-96 rounded-full bg-white/3 blur-3xl" />
        </div>

        {/* System Status Badge */}
        <div className="absolute top-12 left-12 flex items-center gap-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3">
          <div className="size-2 rounded-full bg-success animate-pulse" />
          <span className="text-[13px] font-medium text-white">
            Sistema operativo
          </span>
          <ShieldCheck className="size-4 text-white/80" />
        </div>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center px-12">
          <div className="max-w-md text-center">
            <div className="mb-8 inline-flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-6">
              <HeartPulse className="size-16 text-white/90" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Plataforma de salud integral
            </h2>
            <p className="text-[15px] text-white/70 leading-relaxed">
              Administración clínica para seguimiento integral de pacientes con
              programas de obesidad y agentes de inteligencia artificial.
            </p>
          </div>
        </div>

        {/* Metrics Card */}
        <div className="absolute bottom-12 left-12 right-12">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-6">
            <p className="text-[14px] font-semibold text-white/90 mb-5 leading-relaxed">
              Administración clínica para seguimiento integral de pacientes con obesidad.
            </p>
            <div className="flex items-center gap-8">
              {[
                { icon: UserRound, value: "12.8K", label: "Usuarios", color: "text-info" },
                { icon: Fingerprint, value: "24", label: "Agentes IA", color: "text-success" },
                { icon: HeartPulse, value: "99.8%", label: "Disponibilidad", color: "text-warning" },
              ].map((metric) => (
                <div key={metric.label} className="flex flex-col gap-1">
                  <metric.icon className={cn("size-4", metric.color)} />
                  <span className="text-xl font-bold text-white">
                    {metric.value}
                  </span>
                  <span className="text-[11px] text-white/60">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}