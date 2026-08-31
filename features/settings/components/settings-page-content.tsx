"use client";

import {
  Settings as SettingsIcon,
  Palette,
  Shield,
  Bot,
  Plug,
  Bell,
  FileText,
  Sparkles,
  Check,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/providers/theme-provider";
import { useAccent } from "@/providers/accent-provider";
import { useAppContext } from "@/providers/context-provider";
import { useT, useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { ACCENT_COLORS } from "@/lib/config/accent-colors";
import { useState } from "react";
import { LegalDocumentsSection } from "./legal-documents-section";

interface SettingsNavItem {
  label: string;
  icon: LucideIcon;
  permission?: string;
  /** Descripción mostrada en el placeholder de secciones pendientes. */
  description?: string;
}

// Secciones del módulo Sistema. Las configuraciones administrativas (IA,
// Integraciones) requieren System.AdminSettings: el profesional clínico solo
// ve sus configuraciones personales y generales. Las secciones sin
// implementación (Seguridad, IA, Integraciones, Notificaciones) muestran un
// placeholder elegante — nunca contenido de otra sección.
const settingsNav: SettingsNavItem[] = [
  { label: "General", icon: SettingsIcon },
  { label: "Apariencia", icon: Palette },
  {
    label: "Seguridad",
    icon: Shield,
    description:
      "La seguridad de tu cuenta está protegida por el Auth Service de la plataforma.",
  },
  {
    label: "IA",
    icon: Bot,
    permission: "System.AdminSettings",
    description:
      "Configura los agentes de IA, sus capacidades y el conocimiento disponible.",
  },
  {
    label: "Integraciones",
    icon: Plug,
    permission: "System.AdminSettings",
    description:
      "Conecta la plataforma con servicios externos (mensajería, almacenamiento, correo).",
  },
  {
    label: "Notificaciones",
    icon: Bell,
    description: "Configura cómo y cuándo quieres recibir notificaciones.",
  },
  { label: "Documentación", icon: FileText, permission: "LegalDocuments.View" },
];

/** Placeholder para secciones aún no implementadas (nunca contenido falso). */
function ComingSoonSection({ item }: { item: SettingsNavItem }) {
  const t = useT();
  const Icon = item.icon;
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center animate-fade-in">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong transition-colors">
        <Icon className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[15px] font-semibold text-foreground">
          {t(item.label)}
        </h3>
        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {t(item.description ?? "")}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="size-3" />
        {t("Próximamente")}
      </span>
    </div>
  );
}

export function SettingsPageContent() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const { lang, setLang } = useI18n();
  const { can } = useAppContext();
  const t = useT();
  const [activeSection, setActiveSection] = useState("Apariencia");
  const [density, setDensity] = useState("comodo");
  const [sidebarMode, setSidebarMode] = useState("siempre");

  // Secciones visibles según el contexto (global ∪ scoped de la clínica).
  const visibleSections = settingsNav.filter(
    (item) => !item.permission || can(item.permission),
  );

  // Sección efectiva: si la activa quedó fuera del alcance (cambio de
  // contexto), se muestra Apariencia (siempre visible) sin setState extra.
  const effectiveSection = visibleSections.some(
    (item) => item.label === activeSection,
  )
    ? activeSection
    : "Apariencia";

  const activeNavItem =
    visibleSections.find((item) => item.label === effectiveSection) ??
    settingsNav[0];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t("Configuración")}
        description={t("Personaliza tu experiencia en la plataforma")}
        icon={SettingsIcon}
      />

      <div className="flex gap-6">
        <nav
          className="flex w-[220px] shrink-0 flex-col gap-1"
          aria-label={t("Secciones de configuración")}
        >
          {visibleSections.map((item) => {
            const Icon = item.icon;
            const active = effectiveSection === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveSection(item.label)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-200",
                  active
                    ? "bg-primary-soft font-semibold text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 transition-transform duration-200",
                    !active && "group-hover:scale-110",
                  )}
                />
                {t(item.label)}
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary animate-scale-in" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          {/* key={effectiveSection}: re-mount animado en cada cambio de sección */}
          <div key={effectiveSection} className="animate-slide-up">
            {effectiveSection === "Documentación" ? (
              <LegalDocumentsSection />
            ) : effectiveSection === "General" ? (
              <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
                <SectionHeader
                  title={t("General")}
                  description={t("Preferencias generales de la plataforma")}
                  icon={SettingsIcon}
                  variant="primary"
                />
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[13px] font-semibold text-foreground">
                      {t("Idioma")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("Selecciona el idioma de la plataforma")}
                    </p>
                    <RadioGroup
                      value={lang}
                      onValueChange={(value) => setLang(value as "es" | "en")}
                      className="flex gap-3"
                    >
                      {["es", "en"].map((code) => (
                        <label
                          key={code}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-all duration-200 hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
                        >
                          <RadioGroupItem value={code} />
                          {code === "es" ? t("Español") : t("English")}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            ) : effectiveSection === "Apariencia" ? (
              <>
                <SectionHeader
                  title={t("Apariencia")}
                  description={t("Personaliza el tema y la visualización")}
                  icon={Palette}
                  variant="primary"
                />

                <div className="p-6 flex flex-col gap-6">
                  {/* Theme */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[13px] font-semibold text-foreground">
                      {t("Tema")}
                    </h3>
                    <div className="flex gap-4">
                      {[
                        {
                          id: "light",
                          label: "Claro",
                          bg: "#FFFFFF",
                          bar1: "#E5E7EB",
                          bar2: "#D1D5DB",
                          bar3: "#9CA3AF",
                        },
                        {
                          id: "dark",
                          label: "Oscuro",
                          bg: "#101827",
                          bar1: "#2A3A52",
                          bar2: "#465074",
                          bar3: "#7580A6",
                        },
                      ].map((themeItem) => (
                        <button
                          key={themeItem.id}
                          onClick={() =>
                            setTheme(themeItem.id as "light" | "dark")
                          }
                          className="flex w-[180px] flex-col gap-2 group"
                        >
                          <div
                            className={cn(
                              "flex h-[110px] flex-col overflow-hidden rounded-xl border-2 p-3 transition-all duration-200 group-hover:border-primary/50",
                              theme === themeItem.id
                                ? "border-primary shadow-md"
                                : "border-border",
                            )}
                            style={{ backgroundColor: themeItem.bg }}
                          >
                            <div className="flex h-4 items-center gap-1">
                              <div
                                className="h-1 w-[52px] rounded-full"
                                style={{ backgroundColor: themeItem.bar1 }}
                              />
                            </div>
                            <div className="mt-auto flex flex-col gap-1">
                              <div
                                className="h-1 w-[38px] rounded-full"
                                style={{ backgroundColor: themeItem.bar2 }}
                              />
                              <div
                                className="h-1 w-[44px] rounded-full"
                                style={{ backgroundColor: themeItem.bar3 }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex size-3.5 items-center justify-center rounded-full border-2 transition-colors",
                                theme === themeItem.id
                                  ? "border-primary"
                                  : "border-border",
                              )}
                            >
                              {theme === themeItem.id && (
                                <div className="size-1.5 rounded-full bg-primary animate-scale-in" />
                              )}
                            </div>
                            <span className="text-[12px] font-medium text-foreground">
                              {t(themeItem.label)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Accent Color */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[13px] font-semibold text-foreground">
                      {t("Color de acento")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "El color de acento se aplica a toda la plataforma y se guarda en tu perfil",
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      {ACCENT_COLORS.map((color) => {
                        const selected = accent === color.hex;
                        return (
                          <button
                            key={color.hex}
                            onClick={() => setAccent(color.hex)}
                            aria-label={t(color.name)}
                            aria-pressed={selected}
                            className={cn(
                              "group flex size-9 items-center justify-center rounded-full transition-all duration-200",
                              selected
                                ? "ring-2 ring-offset-2 ring-[var(--accent-color)] ring-offset-card scale-110"
                                : "hover:scale-110 hover:ring-2 hover:ring-border",
                            )}
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: selected
                                ? `0 2px 8px ${color.hex}66`
                                : undefined,
                            }}
                          >
                            {selected && (
                              <Check className="size-4 text-white animate-scale-in" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Density */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[13px] font-semibold text-foreground">
                      {t("Densidad")}
                    </h3>
                    <RadioGroup
                      value={density}
                      onValueChange={setDensity}
                      className="flex gap-3"
                    >
                      {[
                        { value: "compacto", label: t("Compacto") },
                        { value: "comodo", label: t("Cómodo") },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-all duration-200 hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
                        >
                          <RadioGroupItem value={opt.value} />
                          {opt.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Sidebar */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[13px] font-semibold text-foreground">
                      {t("Barra lateral")}
                    </h3>
                    <RadioGroup
                      value={sidebarMode}
                      onValueChange={setSidebarMode}
                      className="flex gap-3"
                    >
                      {[
                        { value: "siempre", label: t("Siempre visible") },
                        { value: "colapsada", label: t("Colapsada") },
                        { value: "iconos", label: t("Solo iconos") },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-all duration-200 hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
                        >
                          <RadioGroupItem value={opt.value} />
                          {opt.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </>
            ) : (
              <ComingSoonSection item={activeNavItem} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
