import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { AccentProvider } from "@/providers/accent-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import "./globals.css";

/* Línea visual COPP-ADRESD: Plus Jakarta Sans para display/headings, Inter
   para UI/cuerpo (mejor legibilidad en tablas y densidad de datos), Geist Mono
   intacto para código y cifras monoespaciadas. */
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Copp Adresd — Admin",
  description: "Panel de administración clínica Copp Adresd",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("copp_lang");
  const lang = langCookie?.value === "en" ? "en" : "es";

  return (
    <html
      lang={lang}
      className={`${plusJakarta.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: extensiones del navegador inyectan
          atributos ajenos (bis_skin_checked, __processed_*) en html/body
          antes de la hidratación; el markup de la app es consistente. */}
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        {/* Guard global de hidratación. Script INLINE PLANO (no next/script):
          se serializa tal cual en el HTML y se ejecuta SÍNCRONO durante el
          parseo, ANTES de que React hidrate. Algunas extensiones del navegador
          marcan elementos del DOM (bis_skin_checked, __processed_*) en rondas
          durante el parseo, provocando falsos mismatches de hidratación en
          cualquier ruta (incluidos divs internos de Next.js). El observer
          limpia esas marcas hasta el evento `load` (la hidratación ya ocurrió
          antes). El circuit-breaker global evita un ping-pong infinito en el
          caso teórico de una extensión que re-marca en respuesta a cada
          remoción. También silencia rechazos de promesas de extensiones
          (chrome-extension://) que ensucian la consola en desarrollo. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var PATTERN = /^(bis_skin_checked|__processed_[a-f0-9-]{8,}__)$/;
  var removals = 0;
  var windowStart = Date.now();
  var observer = null;
  var LIMIT_PER_SEC = 1000;

  function clean(root) {
    if (!root || !root.attributes) return;
    var attrs = root.attributes;
    for (var i = attrs.length - 1; i >= 0; i--) {
      var name = attrs[i].name;
      if (PATTERN.test(name)) {
        var now = Date.now();
        if (now - windowStart > 1000) { removals = 0; windowStart = now; }
        if (++removals > LIMIT_PER_SEC) return;
        root.removeAttribute(name);
      }
    }
  }

  clean(document.documentElement);
  clean(document.head);
  if (document.body) clean(document.body);

  if ("MutationObserver" in window) {
    observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === "childList") {
          for (var j = 0; j < m.addedNodes.length; j++) {
            if (m.addedNodes[j].nodeType === 1) clean(m.addedNodes[j]);
          }
        } else if (m.type === "attributes" && m.attributeName && PATTERN.test(m.attributeName)) {
          clean(m.target);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }
  window.addEventListener("load", function () {
    if (observer) observer.disconnect();
  }, { once: true });

  window.addEventListener("unhandledrejection", function (e) {
    try {
      var stack = e && e.reason && e.reason.stack;
      if (typeof stack === "string" && stack.indexOf("chrome-extension://") !== -1) {
        e.preventDefault();
      }
    } catch (err) {}
  });
})();`,
          }}
        />
        {/* Acento pre-pintura: aplica --accent-color desde localStorage ANTES
            de que React hidrate, evitando el flash del default navy. El
            AccentProvider (cliente) mantiene el estado en runtime. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    var v = localStorage.getItem("copp-accent");
    if (v && /^#[0-9a-fA-F]{6}$/.test(v)) {
      var s = document.documentElement.style;
      s.setProperty("--accent-color", v);
      s.setProperty("--primary-foreground", v.toUpperCase() === "#F59E0B" ? "#1A1D2E" : "#FFFFFF");
    }
  } catch (e) {}
})();`,
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <AccentProvider>
              <I18nProvider initialLang={lang}>
                <TooltipProvider>{children}</TooltipProvider>
              </I18nProvider>
            </AccentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
