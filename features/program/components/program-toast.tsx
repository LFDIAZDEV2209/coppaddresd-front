"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "info" | "error";
}

export function ProgramToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all",
            t.type === "success" &&
              "border-success/20 bg-success-soft text-success-foreground",
            t.type === "info" &&
              "border-info/20 bg-info-soft text-info-foreground",
            t.type === "error" &&
              "border-destructive/20 bg-destructive-soft text-destructive",
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
