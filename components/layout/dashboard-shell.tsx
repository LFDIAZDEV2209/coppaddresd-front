"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AppContextProvider, useAppContext } from "@/providers/context-provider";

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppContextProvider>
      <OnboardingGuard>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((prev) => !prev)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />

          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <Topbar onMenuClick={() => setMobileOpen(true)} />

            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </OnboardingGuard>
    </AppContextProvider>
  );
}
