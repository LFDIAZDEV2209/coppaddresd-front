"use client";

import { Settings as SettingsIcon, Palette, Shield, Bot, Plug, Bell, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/providers/theme-provider";
import { useAppContext } from "@/providers/context-provider";
import { useT, useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LegalDocumentsSection } from "./legal-documents-section";

const accentColors = [
  { name: "Índigo", value: "#4B0082" },
  { name: "Violeta", value: "#7C3AED" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Marino", value: "#123B63" },
  { name: "Teal", value: "#0D9488" },
  { name: "Esmeralda", value: "#10B981" },
  { name: "Ámbar", value: "#F59E0B" },
];

// Secciones del módulo Sistema. Las configuraciones administrativas (IA,
// Integraciones) requieren System.AdminSettings: el profesional clínico solo
// ve sus configuraciones personales y generales.
const settingsNav = [
  { label: "General", icon: SettingsIcon },
  { label: "Apariencia", icon: Palette },
  { label: "Seguridad", icon: Shield },
  { label: "IA", icon: Bot, permission: "System.AdminSettings" },
  { label: "Integraciones", icon: Plug, permission: "System.AdminSettings" },
  { label: "Notificaciones", icon: Bell },
  { label: "Documentación", icon: FileText, permission: "LegalDocuments.View" },
];

export function SettingsPageContent() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { lang, setLang } = useI18n();
  const { can } = useAppContext();
  const t = useT();
  const [activeSection, setActiveSection] = useState("Apariencia");
  const [density, setDensity] = useState("comodo");
  const [sidebarMode, setSidebarMode] = useState("siempre");

  // Secciones visibles según el contexto (global ∪ scoped de la clínica).
  const visibleSections = settingsNav.filter((item) => !item.permission || can(item.permission));

  // Sección efectiva: si la activa quedó fuera del alcance (cambio de
  // contexto), se muestra Apariencia (siempre visible) sin setState extra.
  const effectiveSection = visibleSections.some((item) => item.label === activeSection)
    ? activeSection
    : "Apariencia";

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t("Configuración")}
        description={t("Personaliza tu experiencia en la plataforma")}
        icon={SettingsIcon}
      />

      <div className="flex gap-6">
        <nav className="flex w-[220px] shrink-0 flex-col gap-1">
          {visibleSections.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActiveSection(item.label)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  effectiveSection === item.label
                    ? "bg-primary-soft font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          {effectiveSection === "Documentación" ? <LegalDocumentsSection /> : effectiveSection === "General" ? (
            <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
              <SectionHeader
                title={t("General")}
                description={t("Preferencias generales de la plataforma")}
                icon={SettingsIcon}
                variant="primary"
              />
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <h3 className="text-[13px] font-semibold text-foreground">{t("Idioma")}</h3>
                  <p className="text-xs text-muted-foreground">{t("Selecciona el idioma de la plataforma")}</p>
                  <RadioGroup value={lang} onValueChange={(value) => setLang(value as "es" | "en")} className="flex gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                      <RadioGroupItem value="es" />
                      {t("Español")}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                      <RadioGroupItem value="en" />
                      {t("English")}
                    </label>
                  </RadioGroup>
                </div>
              </div>
            </div>
          ) : <>
          <SectionHeader
            title={t("Apariencia")}
            description={t("Personaliza el tema y la visualización")}
            icon={Palette}
            variant="primary"
          />

          <div className="p-6 flex flex-col gap-6">
            {/* Theme */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold text-foreground">{t("Tema")}</h3>
              <div className="flex gap-4">
                {[
                  { id: "light", label: "Claro", bg: "#FFFFFF", bar1: "#E5E7EB", bar2: "#D1D5DB", bar3: "#9CA3AF" },
                  { id: "dark", label: "Oscuro", bg: "#101827", bar1: "#2A3A52", bar2: "#465074", bar3: "#7580A6" },
                ].map((themeItem) => (
                  <button
                    key={themeItem.id}
                    onClick={() => setTheme(themeItem.id as "light" | "dark")}
                    className="flex w-[180px] flex-col gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-[110px] flex-col overflow-hidden rounded-xl border-2 p-3 transition-colors",
                        theme === themeItem.id ? "border-primary" : "border-border"
                      )}
                      style={{ backgroundColor: themeItem.bg }}
                    >
                      <div className="flex h-4 items-center gap-1">
                        <div className="h-1 w-[52px] rounded-full" style={{ backgroundColor: themeItem.bar1 }} />
                      </div>
                      <div className="mt-auto flex flex-col gap-1">
                        <div className="h-1 w-[38px] rounded-full" style={{ backgroundColor: themeItem.bar2 }} />
                        <div className="h-1 w-[44px] rounded-full" style={{ backgroundColor: themeItem.bar3 }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-3.5 items-center justify-center rounded-full border-2",
                          theme === themeItem.id ? "border-primary" : "border-border"
                        )}
                      >
                        {theme === themeItem.id && (
                          <div className="size-1.5 rounded-full bg-primary" />
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
              <h3 className="text-[13px] font-semibold text-foreground">{t("Color de acento")}</h3>
              <div className="flex gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccent(color.value)}
                    className="flex flex-col items-center gap-1.5"
                    aria-label={t(color.name)}
                  >
                    <div
                      className="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: color.value }}
                    >
                      {accent === color.value && (
                        <div className="size-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Density */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold text-foreground">{t("Densidad")}</h3>
              <RadioGroup value={density} onValueChange={setDensity} className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem value="compacto" />
                  {t("Compacto")}
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem value="comodo" />
                  {t("Cómodo")}
                </label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Sidebar */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold text-foreground">{t("Barra lateral")}</h3>
              <RadioGroup value={sidebarMode} onValueChange={setSidebarMode} className="flex gap-3">
                {[
                  { value: "siempre", label: t("Siempre visible") },
                  { value: "colapsada", label: t("Colapsada") },
                  { value: "iconos", label: t("Solo iconos") },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
                  >
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
          </>}
        </div>
      </div>
    </div>
  );
}
