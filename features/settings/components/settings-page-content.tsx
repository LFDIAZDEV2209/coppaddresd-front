"use client";

import { Settings as SettingsIcon, Palette, Shield, Bot, Plug, Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { useState } from "react";

const accentColors = [
  { name: "Índigo", value: "#4B0082" },
  { name: "Violeta", value: "#7C3AED" },
  { name: "Azul", value: "#123B63" },
  { name: "Teal", value: "#0D9488" },
  { name: "Esmeralda", value: "#10B981" },
  { name: "Ámbar", value: "#F59E0B" },
];

const settingsNav = [
  { label: "General", icon: SettingsIcon },
  { label: "Apariencia", icon: Palette },
  { label: "Seguridad", icon: Shield },
  { label: "IA", icon: Bot },
  { label: "Integraciones", icon: Plug },
  { label: "Notificaciones", icon: Bell },
];

export function SettingsPageContent() {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("Apariencia");
  const [accent, setAccent] = useState("#123B63");
  const [density, setDensity] = useState("comodo");
  const [sidebarMode, setSidebarMode] = useState("siempre");

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Configuración"
        description="Personaliza tu experiencia en la plataforma"
        icon={SettingsIcon}
      />

      <div className="flex gap-6">
        <nav className="flex w-[220px] shrink-0 flex-col gap-1">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActiveSection(item.label)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  activeSection === item.label
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
          <SectionHeader
            title="Apariencia"
            description="Personaliza el tema y la visualización"
            icon={Palette}
            variant="primary"
          />

          <div className="p-6 flex flex-col gap-6">
            {/* Theme */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold text-foreground">Tema</h3>
              <div className="flex gap-4">
                {[
                  { id: "light", label: "Claro", bg: "#FFFFFF", bar1: "#E5E7EB", bar2: "#D1D5DB", bar3: "#9CA3AF" },
                  { id: "dark", label: "Oscuro", bg: "#101827", bar1: "#2A3A52", bar2: "#465074", bar3: "#7580A6" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as "light" | "dark")}
                    className="flex w-[180px] flex-col gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-[110px] flex-col overflow-hidden rounded-xl border-2 p-3 transition-colors",
                        theme === t.id ? "border-primary" : "border-border"
                      )}
                      style={{ backgroundColor: t.bg }}
                    >
                      <div className="flex h-4 items-center gap-1">
                        <div className="h-1 w-[52px] rounded-full" style={{ backgroundColor: t.bar1 }} />
                      </div>
                      <div className="mt-auto flex flex-col gap-1">
                        <div className="h-1 w-[38px] rounded-full" style={{ backgroundColor: t.bar2 }} />
                        <div className="h-1 w-[44px] rounded-full" style={{ backgroundColor: t.bar3 }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-3.5 items-center justify-center rounded-full border-2",
                          theme === t.id ? "border-primary" : "border-border"
                        )}
                      >
                        {theme === t.id && (
                          <div className="size-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-[12px] font-medium text-foreground">
                        {t.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Accent Color */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold text-foreground">Color de acento</h3>
              <div className="flex gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccent(color.value)}
                    className="flex flex-col items-center gap-1.5"
                    aria-label={color.name}
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
              <h3 className="text-[13px] font-semibold text-foreground">Densidad</h3>
              <RadioGroup value={density} onValueChange={setDensity} className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem value="compacto" />
                  Compacto
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem value="comodo" />
                  Cómodo
                </label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Sidebar */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-semibold text-foreground">Barra lateral</h3>
              <RadioGroup value={sidebarMode} onValueChange={setSidebarMode} className="flex gap-3">
                {[
                  { value: "siempre", label: "Siempre visible" },
                  { value: "colapsada", label: "Colapsada" },
                  { value: "iconos", label: "Solo iconos" },
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
        </div>
      </div>
    </div>
  );
}
