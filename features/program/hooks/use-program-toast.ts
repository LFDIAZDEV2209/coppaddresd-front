"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "info" | "error";
}

let nextId = 0;

export function useProgramToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastItem["type"] = "success") => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { toast, toasts, dismiss };
}
