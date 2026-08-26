"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CommunitySidebar } from "./community-sidebar";
import { CommunityTopbar } from "./community-topbar";

export function CommunityErpShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="community-erp flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar escritorio */}
      <div className="hidden lg:flex">
        <CommunitySidebar />
      </div>

      {/* Sidebar móvil (overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 animate-in slide-in-from-left duration-200">
            <CommunitySidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <CommunityTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
