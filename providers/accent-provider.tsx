"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  getPreferences,
  updatePreferenceAccentColor,
} from "@/lib/api/preferences-service";
import { getAccessToken } from "@/lib/api/http";
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  PRIMARY_FOREGROUND_DARK,
  PRIMARY_FOREGROUND_LIGHT,
  findAccentOption,
} from "@/lib/config/accent-colors";

interface AccentContextValue {
  /** Hex #RRGGBB del acento activo. */
  accent: string;
  setAccent: (hex: string) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

/** Guard: solo se aplican hex #RRGGBB válidos. */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function getInitialAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  return stored && HEX_RE.test(stored) ? stored : DEFAULT_ACCENT;
}

/**
 * Aplica el acento al documento: `--accent-color` (del que derivan
 * primary/soft/strong/ring/sidebar en globals.css) y `--primary-foreground`
 * según contraste del acento (WCAG AA). El inline style sobre <html> gana al
 * cascade de `:root` y `.dark`, así un solo set aplica en ambos temas.
 */
function applyAccent(hex: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const option = findAccentOption(hex);
  root.style.setProperty("--accent-color", hex);
  root.style.setProperty(
    "--primary-foreground",
    option?.foreground === "dark"
      ? PRIMARY_FOREGROUND_DARK
      : PRIMARY_FOREGROUND_LIGHT,
  );
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accent, setAccentState] = useState<string>(getInitialAccent);
  // Si el usuario ya eligió un acento (después del mount), el sync del
  // servidor NO debe sobreescribirlo: su PUT ya está en camino y el servidor
  // eventualmente converge. Evita el race restore-sesión vs selección.
  const userChoseRef = useRef(false);

  // Aplica el acento local inmediatamente y persiste en localStorage.
  useEffect(() => {
    applyAccent(accent);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    } catch {
      /* almacenamiento no disponible — el acento solo vive en memoria */
    }
  }, [accent]);

  // Sync con el servidor al autenticar/desautenticar: la preferencia del
  // servidor gana (mismo patrón que I18nProvider), salvo que el usuario ya
  // haya hecho una selección local en esta sesión.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getPreferences();
        if (cancelled) return;
        const serverAccent = prefs?.accentColor;
        if (
          serverAccent &&
          HEX_RE.test(serverAccent) &&
          !userChoseRef.current
        ) {
          setAccentState((prev) =>
            prev === serverAccent ? prev : serverAccent,
          );
        }
      } catch {
        /* sin sesión o servidor caído — se mantiene el acento local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setAccent = useCallback((hex: string) => {
    if (!HEX_RE.test(hex)) return;
    userChoseRef.current = true;
    setAccentState(hex);
    // Write-through al servidor (best effort; sin sesión se ignora).
    if (getAccessToken()) {
      updatePreferenceAccentColor(hex).catch(() => {
        /* sin conexión — el próximo login sincroniza el servidor */
      });
    }
  }, []);

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent]);

  return (
    <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
  );
}

export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    throw new Error("useAccent must be used within an AccentProvider");
  }
  return ctx;
}
