"use client";

import { useRouter } from "next/navigation";
import { Menu, ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { communityBrand } from "../navigation";
import { PostDialog } from "./post-dialog";
import { AwardDialog } from "./award-dialog";

interface CommunityTopbarProps {
  onMenuClick: () => void;
}

export function CommunityTopbar({ onMenuClick }: CommunityTopbarProps) {
  const router = useRouter();
  const t = useT();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-[var(--sidebar)] px-4 text-[var(--sidebar-foreground)]">
      <button
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-[var(--sidebar-hover)] hover:text-white lg:hidden"
        aria-label={t("Abrir menú")}
      >
        <Menu className="size-5" />
      </button>

      <span className="text-[15px] font-extrabold tracking-wide text-white">
        {t(communityBrand)}
      </span>

      <button
        onClick={() => router.push("/dashboard")}
        className="ml-1 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-white/90 transition-all hover:bg-white/10"
      >
        <ArrowLeft className="size-4" />
        {t("Volver al ERP")}
      </button>

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-white/50" />
        <input
          className="h-9 w-72 rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-[13px] text-white placeholder:text-white/50 outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
          placeholder={t("Buscar miembro, post, región…")}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <PostDialog />
        <AwardDialog />
      </div>
    </header>
  );
}
