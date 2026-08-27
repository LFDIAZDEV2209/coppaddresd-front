"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

// Paleta de acentos: cada color define variables CSS para modo claro y oscuro.
const ACCENT_PALETTES: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {
  "#4B0082": {
    // Índigo
    light: { primary: "#4B0082", strong: "#3D006B", soft: "#EDE5F5", foreground: "#FFFFFF" },
    dark:  { primary: "#4B0082", strong: "#7B4DFF", soft: "#2A1F4D", foreground: "#FFFFFF" },
  },
  "#7C3AED": {
    // Violeta
    light: { primary: "#7C3AED", strong: "#6D28D9", soft: "#EDE9FE", foreground: "#FFFFFF" },
    dark:  { primary: "#7C3AED", strong: "#A78BFA", soft: "#2E1F4D", foreground: "#FFFFFF" },
  },
  "#3B82F6": {
    // Azul (default actual)
    light: { primary: "#3B82F6", strong: "#2563EB", soft: "#DBEAFE", foreground: "#FFFFFF" },
    dark:  { primary: "#3B82F6", strong: "#60A5FA", soft: "#1E3A5F", foreground: "#FFFFFF" },
  },
  "#123B63": {
    // Marino
    light: { primary: "#123B63", strong: "#0B2B4A", soft: "#E5F0FA", foreground: "#FFFFFF" },
    dark:  { primary: "#123B63", strong: "#3B82F6", soft: "#1E2F4A", foreground: "#FFFFFF" },
  },
  "#0D9488": {
    // Teal
    light: { primary: "#0D9488", strong: "#0F766E", soft: "#CCFBF1", foreground: "#FFFFFF" },
    dark:  { primary: "#0D9488", strong: "#2DD4BF", soft: "#0F2E2B", foreground: "#FFFFFF" },
  },
  "#10B981": {
    // Esmeralda
    light: { primary: "#10B981", strong: "#059669", soft: "#D1FAE5", foreground: "#FFFFFF" },
    dark:  { primary: "#10B981", strong: "#34D399", soft: "#064E3B", foreground: "#FFFFFF" },
  },
  "#F59E0B": {
    // Ámbar
    light: { primary: "#F59E0B", strong: "#D97706", soft: "#FEF3C7", foreground: "#1A1D2E" },
    dark:  { primary: "#F59E0B", strong: "#FBBF24", soft: "#78350F", foreground: "#FFFFFF" },
  },
};

const DEFAULT_ACCENT = "#3B82F6";

function getInitialAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  return localStorage.getItem("copp-accent") || DEFAULT_ACCENT;
}

// Aplica el color de acento como variables CSS en :root
function applyAccent(accent: string, theme: Theme) {
  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES[DEFAULT_ACCENT];
  const colors = theme === "dark" ? palette.dark : palette.light;
  const el = document.documentElement;

  el.style.setProperty("--primary", colors.primary);
  el.style.setProperty("--primary-strong", colors.strong);
  el.style.setProperty("--primary-soft", colors.soft);
  el.style.setProperty("--primary-foreground", colors.foreground);
  el.style.setProperty("--ring", colors.primary);
  el.style.setProperty("--chart-1", colors.primary);
  el.style.setProperty("--sidebar-active-border", colors.primary);
  el.style.setProperty("--sidebar-active-bg", `color-mix(in srgb, ${colors.primary} 18%, transparent)`);

  localStorage.setItem("copp-accent", accent);
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  accent: string;
  setAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("copp-theme") as Theme) || "light";
}

function applyTheme(theme: Theme) {
  localStorage.setItem("copp-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accent, setAccentState] = useState<string>(getInitialAccent);

  useEffect(() => {
    applyTheme(theme);
    applyAccent(accent, theme);
  }, [theme, accent]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setAccent = useCallback((c: string) => {
    setAccentState(c);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
