"use client";

import { useErp } from "../erp-provider";

export function ErpToaster() {
  const { toasts } = useErp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2.5 rounded-xl bg-[var(--sidebar)] px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/10"
        >
          <span
            className="size-1.5 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
