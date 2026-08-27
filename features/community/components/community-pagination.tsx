"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/providers/i18n-provider";

export function CommunityPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {total === 0 ? t("Sin resultados") : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, total)} ${t("de")} ${total}`}
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => { if (v !== null) onPageSizeChange(Number(v)); }}>
          <SelectTrigger className="h-7 w-[88px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / {t("página")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="size-3.5" />
          {t("Anterior")}
        </Button>
        <span className="min-w-[84px] text-center text-xs text-muted-foreground">
          {t("Página")} {safePage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          {t("Siguiente")}
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
