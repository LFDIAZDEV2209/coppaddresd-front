"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  GraduationCap,
  Loader2,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { fetchMyProfile, updateMyProfile } from "@/lib/api/context-service";
import {
  fetchProfessionalTypes,
  fetchSpecialties,
  type ProfessionalTypeDto,
  type SpecialtyDto,
} from "@/features/professionals/services/professional-catalogs-service";
import { ApiError } from "@/lib/api/http";

/** Claves de categoría — coinciden con el campo `category` de la API. */
const SPECIALTY_CATEGORIES = [
  "Medicina",
  "Nutrición",
  "Salud mental",
  "Enfermería",
  "Terapia",
  "Coordinación",
  "Fitness",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh: refreshContext } = useAppContext();
  const t = useT();

  const [types, setTypes] = useState<ProfessionalTypeDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(1);
  const [typeId, setTypeId] = useState<string>("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prof, ts, ss] = await Promise.all([
          fetchMyProfile(),
          fetchProfessionalTypes(),
          fetchSpecialties(),
        ]);
        if (cancelled) return;
        setTypes(ts);
        setSpecialties(ss);
        setTypeId(prof.professional?.professionalTypeId ?? "");
        setSelectedSpecialties(prof.professional?.specialtyIds ?? []);
        setBio(prof.professional?.bio ?? "");
        setPhone(prof.phoneNumber ?? "");
        const firstLicense = prof.professional?.licenses?.[0];
        if (firstLicense?.number) setLicenseNumber(firstLicense.number);
      } catch {
        if (!cancelled)
          setError(t("No se pudieron cargar los datos. Intenta nuevamente."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const selectedType = useMemo(
    () => types.find((pt) => pt.id === typeId) ?? null,
    [types, typeId],
  );

  const validSpecialtyIds = useMemo(
    () => new Set(selectedType?.validSpecialtyIds ?? []),
    [selectedType],
  );

  const specialtiesByCategory = useMemo(() => {
    const valid = specialties.filter((s) => validSpecialtyIds.has(s.id));
    return SPECIALTY_CATEGORIES.map((category) => ({
      category,
      items: valid.filter((s) => s.category === category),
    })).filter((group) => group.items.length > 0);
  }, [specialties, validSpecialtyIds]);

  const toggleSpecialty = useCallback((id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const canContinueStep1 = typeId !== "" && selectedSpecialties.length > 0;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({
        professionalTypeId: typeId,
        specialtyIds: selectedSpecialties,
        bio: bio || null,
        phoneCountryCode: phone.startsWith("+") ? null : "1",
        phoneNumber: phone || null,
        licenses: licenseNumber
          ? [
              {
                licenseType: "Other",
                number: licenseNumber,
                verificationStatus: "Pending",
              },
            ]
          : [],
        completeOnboarding: true,
      });
      // Refresca el contexto (onboardingCompleted=true) antes de navegar para
      // que el guard ya no redirija de vuelta a /onboarding.
      await refreshContext();
      router.push("/dashboard");
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError
          ? err.message
          : t("No se pudo guardar el perfil. Intenta nuevamente."),
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        {t("Cargando...")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader
        title={t("Completa tu perfil profesional")}
        description={t(
          "Cuéntanos tu profesión y especialidades para configurar tu cuenta. Es un paso rápido.",
        )}
        icon={GraduationCap}
      />

      {/* Steps indicator */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                step >= s ? "bg-primary" : "bg-muted"
              }`}
            />
            <span
              className={`text-[11px] font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s === 1
                ? t("Profesión y especialidad")
                : t("Detalles del perfil")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Stethoscope className="size-4 text-primary" />
              {t("¿Cuál es tu profesión?")}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {t("Selecciona el rol clínico con el que atenderás pacientes.")}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {types.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => {
                    setTypeId(pt.id);
                    setSelectedSpecialties([]);
                  }}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    typeId === pt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="block text-[13px] font-semibold">
                    {pt.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground line-clamp-1">
                    {pt.description}
                  </span>
                </button>
              ))}
            </div>

            {selectedType && (
              <div className="mt-6">
                <h3 className="text-[13.5px] font-semibold">
                  {t("Especialidades válidas para {name}", {
                    name: selectedType.name,
                  })}
                </h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {t("Puedes seleccionar una o varias.")}
                </p>

                <div className="mt-3 space-y-3">
                  {specialtiesByCategory.map((group) => (
                    <div key={group.category}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {group.category}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.items.map((s) => {
                          const active = selectedSpecialties.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleSpecialty(s.id)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              {active && <BadgeCheck className="size-3.5" />}
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("Continuar")}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[15px] font-semibold">
              {t("Detalles del perfil")}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {t(
                "Completa tus datos de contacto y credenciales. Puedes editarlos después.",
              )}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="bio"
                  className="mb-1.5 block text-[12.5px] font-medium"
                >
                  {t("Biografía profesional")}
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder={t(
                    "Cuéntanos tu experiencia y enfoque clínico...",
                  )}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-[12.5px] font-medium"
                  >
                    {t("Teléfono de contacto")}
                  </label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="555-010-2244"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="license"
                    className="mb-1.5 block text-[12.5px] font-medium"
                  >
                    {t("Licencia profesional (opcional)")}
                  </label>
                  <input
                    id="license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder={t("Número de licencia")}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium hover:bg-muted transition-colors"
              >
                <ArrowLeft className="size-4" />
                {t("Atrás")}
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BadgeCheck className="size-4" />
                )}
                {t("Completar onboarding")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
