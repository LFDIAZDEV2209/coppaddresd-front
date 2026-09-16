"use client";

import { useCallback } from "react";
import { notificationsApi } from "../services/notifications-service";
import type { NotificationChannel, NotificationStatus } from "../types";
import { useAsyncData } from "./use-health-tests";

/**
 * Hooks del sub-módulo de notificaciones de alertas (SPEC A13).
 *
 * Envuelven `notificationsApi` con el patrón `useAsyncData` del módulo
 * (cache por clave + reload manual). Los filtros se pasan como primitivos para
 * que la clave y el loader sean estables entre renders.
 */

/** Lista de plantillas (Template Studio). */
export function useNotificationTemplates(params?: {
  channel?: NotificationChannel;
  search?: string;
  isActive?: boolean;
}) {
  const channel = params?.channel;
  const search = params?.search;
  const isActive = params?.isActive;
  const key = `notif-templates:${channel ?? "all"}:${search ?? ""}:${isActive ?? "all"}`;

  const loader = useCallback(
    () => notificationsApi.listTemplates({ channel, search, isActive }),
    [channel, search, isActive],
  );

  return useAsyncData(loader, key);
}

/** Una plantilla concreta (incluye historial si el backend lo devuelve). */
export function useNotificationTemplate(id: string | null | undefined) {
  const loader = useCallback(
    () =>
      id ? notificationsApi.getTemplate(id) : Promise.resolve(null),
    [id],
  );

  return useAsyncData(loader, `notif-template:${id ?? "none"}`);
}

/** Historial de versiones de una plantilla. */
export function useTemplateVersions(id: string | null | undefined) {
  const loader = useCallback(
    () => (id ? notificationsApi.listTemplateVersions(id) : Promise.resolve([])),
    [id],
  );

  return useAsyncData(loader, `notif-template-versions:${id ?? "none"}`);
}

/** Registro de notificaciones enviadas (filtros + paginación). */
export function useNotifications(params?: {
  alertId?: string;
  patientId?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const alertId = params?.alertId;
  const patientId = params?.patientId;
  const channel = params?.channel;
  const status = params?.status;
  const from = params?.from;
  const to = params?.to;
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const key = `notif-log:${alertId ?? ""}:${patientId ?? ""}:${channel ?? ""}:${status ?? ""}:${from ?? ""}:${to ?? ""}:${page}:${pageSize}`;

  const loader = useCallback(
    () =>
      notificationsApi.listNotifications({
        alertId,
        patientId,
        channel,
        status,
        from,
        to,
        page,
        pageSize,
      }),
    [alertId, patientId, channel, status, from, to, page, pageSize],
  );

  return useAsyncData(loader, key);
}

/** Agregados para los gráficos de alertas/notificaciones. */
export function useNotificationCharts(days = 30) {
  const loader = useCallback(
    () => notificationsApi.getCharts(days),
    [days],
  );

  return useAsyncData(loader, `notif-charts:${days}`);
}
