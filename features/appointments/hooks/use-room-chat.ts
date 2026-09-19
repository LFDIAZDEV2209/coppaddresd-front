"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/providers/i18n-provider";
import {
  fetchChatMessages,
  sendChatMessage,
} from "../services/appointments-service";
import type { ChatMessageDto } from "../types";

/**
 * Chat de la consulta con polling incremental: GET cada ~4 s usando el cursor
 * `after`/`afterId` (nunca duplica por id), envío optimista reconciliado por
 * id y mensajes fallidos con reintento manual.
 */

export interface RoomChatMessage extends ChatMessageDto {
  /** Identidad local estable para reconciliar el envío optimista. */
  clientId: string;
  status: "sent" | "sending" | "failed";
}

const POLL_INTERVAL_MS = 4000;
const PAGE_LIMIT = 100;

interface Cursor {
  after: string | null;
  afterId: string | null;
}

export interface UseRoomChatResult {
  messages: RoomChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  unread: number;
  send: (body: string) => Promise<void>;
  retryMessage: (clientId: string) => Promise<void>;
  retryLoad: () => void;
}

export function useRoomChat({
  appointmentId,
  polling,
  visible,
  canSend,
}: {
  appointmentId: string;
  /** El polling corre mientras el panel esté abierto. */
  polling: boolean;
  /** La pestaña de chat está a la vista (resetea el badge de no leídos). */
  visible: boolean;
  /** El estado de la cita permite enviar (Confirmed | InProgress | Completed). */
  canSend: boolean;
}): UseRoomChatResult {
  const t = useT();
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const cursorRef = useRef<Cursor>({ after: null, afterId: null });
  const seenIdsRef = useRef(new Set<string>());
  const visibleRef = useRef(visible);
  const canSendRef = useRef(canSend);

  // Ajuste de estado durante el render (patrón recomendado por React): al
  // abrir la pestaña de chat se limpia el badge de no leídos.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setUnread(0);
  }

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    canSendRef.current = canSend;
  }, [canSend]);

  const merge = useCallback((incoming: ChatMessageDto[]) => {
    const fresh = incoming.filter(
      (message) => !seenIdsRef.current.has(message.id),
    );
    if (fresh.length === 0) return;
    fresh.forEach((message) => seenIdsRef.current.add(message.id));
    setMessages((prev) => [
      ...prev,
      ...fresh.map((message) => ({
        ...message,
        clientId: message.id,
        status: "sent" as const,
      })),
    ]);
    if (!visibleRef.current) setUnread((count) => count + fresh.length);
  }, []);

  const advanceCursor = useCallback((message: ChatMessageDto) => {
    cursorRef.current = {
      after: message.createdAt,
      afterId: message.id,
    };
  }, []);

  // --- Polling incremental ---

  useEffect(() => {
    if (!polling || !appointmentId) return;
    let active = true;

    const poll = async () => {
      try {
        const result = await fetchChatMessages(appointmentId, {
          after: cursorRef.current.after,
          afterId: cursorRef.current.afterId,
          limit: PAGE_LIMIT,
        });
        if (!active) return;
        setError(null);
        if (result.length > 0) {
          advanceCursor(result[result.length - 1]);
          merge(result);
        }
      } catch {
        if (!active) return;
        setError(t("No se pudieron cargar los mensajes."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [advanceCursor, appointmentId, merge, polling, refreshKey, t]);

  // --- Envío optimista ---

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !canSendRef.current) return;
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: RoomChatMessage = {
        id: clientId,
        appointmentId,
        senderUserId: "",
        senderRole: "Professional",
        body: trimmed,
        createdAt: new Date().toISOString(),
        clientId,
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      try {
        const saved = await sendChatMessage(appointmentId, trimmed);
        seenIdsRef.current.add(saved.id);
        advanceCursor(saved);
        setMessages((prev) =>
          prev.map((message) =>
            message.clientId === clientId
              ? { ...saved, clientId, status: "sent" }
              : message,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.clientId === clientId
              ? { ...message, status: "failed" }
              : message,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [advanceCursor, appointmentId],
  );

  const retryMessage = useCallback(
    async (clientId: string) => {
      const target = messages.find((message) => message.clientId === clientId);
      if (!target || target.status !== "failed") return;
      setMessages((prev) =>
        prev.map((message) =>
          message.clientId === clientId
            ? { ...message, status: "sending" }
            : message,
        ),
      );
      try {
        const saved = await sendChatMessage(appointmentId, target.body);
        seenIdsRef.current.add(saved.id);
        advanceCursor(saved);
        setMessages((prev) =>
          prev.map((message) =>
            message.clientId === clientId
              ? { ...saved, clientId, status: "sent" }
              : message,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.clientId === clientId
              ? { ...message, status: "failed" }
              : message,
          ),
        );
      }
    },
    [advanceCursor, appointmentId, messages],
  );

  const retryLoad = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    messages,
    loading,
    error,
    sending,
    unread,
    send,
    retryMessage,
    retryLoad,
  };
}
