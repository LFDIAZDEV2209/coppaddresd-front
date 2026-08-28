"use client";

import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { communityBrand } from "../navigation";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface CommunityTopbarProps {
  onMenuClick: () => void;
}

export function CommunityTopbar({ onMenuClick }: CommunityTopbarProps) {
  const router = useRouter();
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[var(--sidebar)] px-4 text-[var(--sidebar-foreground)]">
      <button
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-lg text-white/70 transition-all hover:bg-[var(--sidebar-hover)] hover:text-white active:scale-95 lg:hidden"
        aria-label={t("Abrir menú")}
      >
        <Menu className="size-5" />
      </button>

      <span className="text-[15px] font-extrabold tracking-wide text-white">
        {t(communityBrand)}
      </span>

      <button
        onClick={() => router.push("/dashboard")}
        className="ml-1 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-white/90 transition-all hover:bg-white/10 hover:text-white active:scale-[0.97]"
      >
        {t("Volver al ERP general")}
      </button>

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-white/50" />
        <input
          className="h-9 w-64 rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus-visible:border-white/30 focus-visible:ring-2 focus-visible:ring-white/20 xl:w-72"
          placeholder={t("Buscar miembro, post, región…")}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <LanguageToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
      </div>
    </header>
  );
}
