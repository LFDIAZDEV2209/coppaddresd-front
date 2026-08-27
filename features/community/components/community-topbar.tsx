"use client";

import { useRouter } from "next/navigation";
import { Menu, ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { communityBrand } from "../navigation";
import { PostDialog } from "./post-dialog";
import { AwardDialog } from "./award-dialog";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface CommunityTopbarProps {
  onMenuClick: () => void;
}

export function CommunityTopbar({ onMenuClick }: CommunityTopbarProps) {
  const router = useRouter();
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[var(--sidebar)] px-4 text-[var(--sidebar-foreground)] after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#8B5CF6]/50 after:to-transparent">
      <button
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-lg text-white/70 transition-all hover:bg-[var(--sidebar-hover)] hover:text-white active:scale-95 lg:hidden"
        aria-label={t("Abrir menú")}
      >
        <Menu className="size-5" />
      </button>

      <span className="bg-gradient-to-r from-white to-[#C4B5FD] bg-clip-text text-[15px] font-extrabold tracking-wide text-transparent">
        {t(communityBrand)}
      </span>

      <button
        onClick={() => router.push("/dashboard")}
        className="group ml-1 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-white/90 transition-all hover:-translate-y-px hover:bg-white/10 hover:text-white active:scale-[0.97]"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        {t("Volver al ERP")}
      </button>

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-white/50" />
        <input
          className="h-9 w-64 rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-[13px] text-white outline-none transition-all placeholder:text-white/50 focus-visible:border-[#8B5CF6]/50 focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/40 xl:w-72"
          placeholder={t("Buscar miembro, post, región…")}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <LanguageToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
        <PostDialog />
        <AwardDialog />
      </div>
    </header>
  );
}
