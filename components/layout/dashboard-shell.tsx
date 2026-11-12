"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import {
  AppContextProvider,
  useAppContext,
} from "@/providers/context-provider";
import { PermissionRouteGuard } from "@/components/feedback/permission-route-guard";

/** Redirige a /onboarding si el profesional aún no completó su wizard. */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { context, loading } = useAppContext();

  useEffect(() => {
    if (loading) return;
    const needsOnboarding =
      context?.employeeStatus === "Invited" ||
      (context?.isProfessional && !context.onboardingCompleted);
    if (needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [context, loading, pathname, router]);

  return <>{children}</>;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <AppContextProvider>
      <OnboardingGuard>
        <div className="flex h-dvh overflow-hidden bg-background">
          <a
            href="#workspace-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground"
          >
            {t("Ir al contenido")}
          </a>
          <Sidebar
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />

          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <Topbar
              mobileOpen={mobileOpen}
              onMenuClick={() => setMobileOpen(true)}
            />

            <main
              id="workspace-content"
              tabIndex={-1}
              className="@container/workspace relative min-h-0 min-w-0 flex-1 overflow-y-auto outline-none"
            >
              <PermissionRouteGuard>{children}</PermissionRouteGuard>
            </main>
          </div>
        </div>
      </OnboardingGuard>
    </AppContextProvider>
  );
}
