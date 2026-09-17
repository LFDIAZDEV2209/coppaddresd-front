import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  AlertSeverity,
  CreateNotificationTemplateInput,
  HealthNotification,
  NotificationChannel,
  NotificationCharts,
  NotificationChartPoint,
  NotificationLanguage,
  NotificationStatus,
  NotificationTemplate,
  NotificationTemplateInput,
  NotificationTemplateVersion,
  NotifyAlertItemResult,
  NotifyAlertsFilters,
  NotifyAlertsInput,
  NotifyAlertsResult,
} from "../types";
import { invalidateHealthTestsCache } from "./health-tests-service";

/**
 * Service de notificaciones de alertas de Tests de Salud (SPEC A13).
 *
 * Frontera única del sub-módulo: el Template Studio, el asistente de envío y el
 * historial consumen SIEMPRE estas funciones (nunca `apiFetch` directo). El
 * backend expone los endpoints bajo `/api/v1/health-tests/notification-templates`,
 * `/alerts/notify`, `/notifications` y `/notifications/charts`.
 */

const BASE = `${env.apiUrl}/api/v1/health-tests`;

// --- DTOs del backend (espejo) ---

interface PaginatedDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface NotificationTemplateDto {
  id: string;
  code: string;
  nameEs: string;
  nameEn: string | null;
  channel: string;
  severity: string | null;
  testCategory: string | null;
  indicatorCode: string | null;
  subjectEs: string | null;
  subjectEn: string | null;
  bodyTemplateEs: string;
  bodyTemplateEn: string | null;
  isActive: boolean;
  usageCount: number;
  versionCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface NotificationTemplateVersionDto {
  id: string;
  templateId: string;
  version: number;
  nameEs: string;
  nameEn: string | null;
  channel: string;
  severity: string | null;
  testCategory: string | null;
  indicatorCode: string | null;
  subjectEs: string | null;
  subjectEn: string | null;
  bodyTemplateEs: string;
  bodyTemplateEn: string | null;
  note: string | null;
  createdAt: string;
}

interface NotificationDto {
  id: string;
  alertId: string | null;
  patientId: string | null;
  patientName: string | null;
  channel: string;
  language: string;
  templateId: string | null;
  templateName: string | null;
  recipient: string;
  renderedBody: string;
  status: string;
  provider: string;
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface NotifyAlertItemResultDto {
  alertId: string | null;
  patientId: string | null;
  patientName: string | null;
  channel: string;
  language: string;
  status: string;
  reason: string | null;
  renderedBody: string;
  recipient: string;
}

interface NotifyAlertsResultDto {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  preview: boolean;
  items: NotifyAlertItemResultDto[];
}

interface NotificationChartsDto {
  alertsBySeverity: Record<string, number>;
  alertsByStatus: Record<string, number>;
  alertsByIndicator: Record<string, number>;
  alertsByDay: NotificationChartPoint[];
  notificationsByChannel: Record<string, number>;
  notificationsByStatus: Record<string, number>;
  notificationsByDay: NotificationChartPoint[];
}

// --- Mapeo de enums ---

const SEVERITY_FROM_BACKEND: Record<string, AlertSeverity> = {
  critical: "critica",
  high: "alta",
  moderate: "media",
  low: "baja",
};

const SEVERITY_TO_BACKEND: Record<AlertSeverity, string> = {
  critica: "critical",
  alta: "high",
  media: "moderate",
  baja: "low",
  informativa: "low",
};

function mapSeverity(value: string | null): AlertSeverity | null {
  if (!value) return null;
  return SEVERITY_FROM_BACKEND[value] ?? null;
}

function severityToBackend(value?: AlertSeverity | null): string | null {
  if (!value) return null;
  return SEVERITY_TO_BACKEND[value] ?? null;
}

function mapChannel(value: string): NotificationChannel {
  return value === "sms" ? "sms" : "community";
}

function mapLanguage(value: string | null | undefined): NotificationLanguage {
  return value === "en" ? "en" : "es";
}

function mapStatus(value: string): NotificationStatus {
  switch (value) {
    case "sent":
    case "failed":
    case "skipped":
      return value;
    default:
      return "queued";
  }
}

function mapTemplate(dto: NotificationTemplateDto): NotificationTemplate {
  return {
    id: dto.id,
    code: dto.code,
    nameEs: dto.nameEs,
    nameEn: dto.nameEn,
    channel: mapChannel(dto.channel),
    severity: mapSeverity(dto.severity),
    testCategory: dto.testCategory,
    indicatorCode: dto.indicatorCode,
    subjectEs: dto.subjectEs,
    subjectEn: dto.subjectEn,
    bodyTemplateEs: dto.bodyTemplateEs,
    bodyTemplateEn: dto.bodyTemplateEn,
    isActive: dto.isActive,
    usageCount: dto.usageCount ?? 0,
    versionCount: dto.versionCount ?? 0,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function mapTemplateVersion(
  dto: NotificationTemplateVersionDto,
): NotificationTemplateVersion {
  return {
    id: dto.id,
    templateId: dto.templateId,
    version: dto.version,
    nameEs: dto.nameEs,
    nameEn: dto.nameEn,
    channel: mapChannel(dto.channel),
    severity: mapSeverity(dto.severity),
    testCategory: dto.testCategory,
    indicatorCode: dto.indicatorCode,
    subjectEs: dto.subjectEs,
    subjectEn: dto.subjectEn,
    bodyTemplateEs: dto.bodyTemplateEs,
    bodyTemplateEn: dto.bodyTemplateEn,
    note: dto.note,
    createdAt: dto.createdAt,
  };
}

function mapNotification(dto: NotificationDto): HealthNotification {
  return {
    id: dto.id,
    alertId: dto.alertId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    channel: mapChannel(dto.channel),
    language: mapLanguage(dto.language),
    templateId: dto.templateId,
    templateName: dto.templateName,
    recipient: dto.recipient,
    renderedBody: dto.renderedBody,
    status: mapStatus(dto.status),
    provider: dto.provider,
    providerMessageId: dto.providerMessageId,
    error: dto.error,
    createdAt: dto.createdAt,
    sentAt: dto.sentAt,
  };
}

function mapNotifyItem(dto: NotifyAlertItemResultDto): NotifyAlertItemResult {
  return {
    alertId: dto.alertId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    channel: mapChannel(dto.channel),
    language: mapLanguage(dto.language),
    status: mapStatus(dto.status),
    reason: dto.reason,
    renderedBody: dto.renderedBody,
    recipient: dto.recipient,
  };
}

function mapNotifyResult(dto: NotifyAlertsResultDto): NotifyAlertsResult {
  return {
    requested: dto.requested,
    sent: dto.sent,
    skipped: dto.skipped,
    failed: dto.failed,
    preview: dto.preview,
    items: (dto.items ?? []).map(mapNotifyItem),
  };
}

// --- Plantillas ---

export interface TemplateListFilters {
  channel?: NotificationChannel;
  search?: string;
  isActive?: boolean;
}

async function listTemplates(
  filters: TemplateListFilters = {},
): Promise<NotificationTemplate[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.search) params.set("search", filters.search);
  if (filters.isActive !== undefined) params.set("isActive", String(filters.isActive));
  const response = await apiFetch<PaginatedDto<NotificationTemplateDto>>(
    `${BASE}/notification-templates?${params.toString()}`,
  );
  return response.data.map(mapTemplate);
}

async function getTemplate(id: string): Promise<NotificationTemplate | null> {
  try {
    const dto = await apiFetch<NotificationTemplateDto>(
      `${BASE}/notification-templates/${id}`,
    );
    return mapTemplate(dto);
  } catch {
    return null;
  }
}

function templateBody(
  input: CreateNotificationTemplateInput | NotificationTemplateInput,
) {
  return {
    nameEs: input.nameEs,
    nameEn: input.nameEn ?? null,
    channel: input.channel,
    bodyTemplateEs: input.bodyTemplateEs,
    bodyTemplateEn: input.bodyTemplateEn ?? null,
    severity: severityToBackend(input.severity),
    testCategory: input.testCategory ?? null,
    indicatorCode: input.indicatorCode ?? null,
    subjectEs: input.subjectEs ?? null,
    subjectEn: input.subjectEn ?? null,
    isActive: input.isActive ?? true,
    note: input.note ?? null,
  };
}

async function createTemplate(
  input: CreateNotificationTemplateInput,
): Promise<NotificationTemplate> {
  const dto = await apiFetch<NotificationTemplateDto>(
    `${BASE}/notification-templates`,
    {
      method: "POST",
      body: JSON.stringify({ ...templateBody(input), code: input.code }),
    },
  );
  invalidateHealthTestsCache();
  return mapTemplate(dto);
}

async function updateTemplate(
  id: string,
  input: NotificationTemplateInput,
): Promise<NotificationTemplate> {
  const dto = await apiFetch<NotificationTemplateDto>(
    `${BASE}/notification-templates/${id}`,
    { method: "PUT", body: JSON.stringify(templateBody(input)) },
  );
  invalidateHealthTestsCache();
  return mapTemplate(dto);
}

async function setTemplateActive(
  id: string,
  isActive: boolean,
): Promise<NotificationTemplate> {
  const action = isActive ? "activate" : "deactivate";
  const dto = await apiFetch<NotificationTemplateDto>(
    `${BASE}/notification-templates/${id}/${action}`,
    { method: "POST" },
  );
  invalidateHealthTestsCache();
  return mapTemplate(dto);
}

async function cloneTemplate(
  id: string,
  code: string,
  nameEs?: string,
  nameEn?: string,
): Promise<NotificationTemplate> {
  const dto = await apiFetch<NotificationTemplateDto>(
    `${BASE}/notification-templates/${id}/clone`,
    {
      method: "POST",
      body: JSON.stringify({
        code,
        nameEs: nameEs ?? null,
        nameEn: nameEn ?? null,
      }),
    },
  );
  invalidateHealthTestsCache();
  return mapTemplate(dto);
}

async function listTemplateVersions(
  id: string,
): Promise<NotificationTemplateVersion[]> {
  const versions = await apiFetch<NotificationTemplateVersionDto[]>(
    `${BASE}/notification-templates/${id}/versions`,
  );
  return versions.map(mapTemplateVersion);
}

async function restoreTemplateVersion(
  id: string,
  version: number,
): Promise<NotificationTemplate> {
  const dto = await apiFetch<NotificationTemplateDto>(
    `${BASE}/notification-templates/${id}/versions/${version}/restore`,
    { method: "POST" },
  );
  invalidateHealthTestsCache();
  return mapTemplate(dto);
}

export interface NotificationTemplatePreviewDto {
  templateId: string;
  templateName: string;
  channel: string;
  language: string;
  alertId: string | null;
  patientId: string | null;
  bodyTemplate: string;
  renderedBody: string;
  recipient: string | null;
  isReachable: boolean;
  skipReason: string | null;
  usedFallbackLanguage: boolean;
  missingPlaceholders: string[];
}

export interface NotificationTemplatePreview {
  templateId: string;
  templateName: string;
  channel: NotificationChannel;
  language: NotificationLanguage;
  alertId: string | null;
  patientId: string | null;
  bodyTemplate: string;
  renderedBody: string;
  recipient: string | null;
  isReachable: boolean;
  skipReason: string | null;
  /** El idioma pedido no tenía traducción y se usó el español. */
  usedFallbackLanguage: boolean;
  missingPlaceholders: string[];
}

interface SendTestInput {
  channel: NotificationChannel;
  language?: NotificationLanguage;
  phoneNumber?: string;
  patientId?: string;
  bodyOverride?: string;
}

async function sendTest(
  templateId: string,
  input: SendTestInput,
): Promise<NotifyAlertItemResult> {
  const dto = await apiFetch<NotifyAlertItemResultDto>(
    `${BASE}/notification-templates/${templateId}/test`,
    {
      method: "POST",
      body: JSON.stringify({
        channel: input.channel,
        language: input.language ?? "es",
        phoneNumber: input.phoneNumber ?? null,
        patientId: input.patientId ?? null,
        bodyOverride: input.bodyOverride ?? null,
      }),
    },
  );
  return mapNotifyItem(dto);
}

// --- Vista previa real (datos de una alerta) ---

export interface TemplatePreviewInput {
  alertId?: string | null;
  channel?: NotificationChannel | null;
  bodyOverride?: string | null;
  language?: NotificationLanguage;
}

async function previewTemplate(
  templateId: string,
  input: TemplatePreviewInput = {},
): Promise<NotificationTemplatePreview> {
  const params = new URLSearchParams();
  if (input.alertId) params.set("alertId", input.alertId);
  if (input.channel) params.set("channel", input.channel);
  if (input.bodyOverride) params.set("bodyOverride", input.bodyOverride);
  if (input.language) params.set("language", input.language);
  const query = params.toString();
  const dto = await apiFetch<NotificationTemplatePreviewDto>(
    `${BASE}/notification-templates/${templateId}/preview${query ? `?${query}` : ""}`,
  );
  return {
    templateId: dto.templateId,
    templateName: dto.templateName,
    channel: mapChannel(dto.channel),
    language: mapLanguage(dto.language),
    alertId: dto.alertId,
    patientId: dto.patientId,
    bodyTemplate: dto.bodyTemplate,
    renderedBody: dto.renderedBody,
    recipient: dto.recipient,
    isReachable: dto.isReachable,
    skipReason: dto.skipReason,
    usedFallbackLanguage: dto.usedFallbackLanguage ?? false,
    missingPlaceholders: dto.missingPlaceholders ?? [],
  };
}

// --- Envío masivo y registro ---

async function notify(input: NotifyAlertsInput): Promise<NotifyAlertsResult> {
  const dto = await apiFetch<NotifyAlertsResultDto>(`${BASE}/alerts/notify`, {
    method: "POST",
    body: JSON.stringify({
      alertIds: input.alertIds,
      channels: input.channels,
      templateId: input.templateId ?? null,
      bodyOverride: input.bodyOverride ?? null,
      language: input.language ?? "es",
      preview: input.preview ?? false,
    }),
  });
  if (!dto.preview) invalidateHealthTestsCache();
  return mapNotifyResult(dto);
}

async function listNotifications(
  filters: NotifyAlertsFilters = {},
): Promise<{ items: HealthNotification[]; total: number }> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    pageSize: String(filters.pageSize ?? 20),
  });
  if (filters.alertId) params.set("alertId", filters.alertId);
  if (filters.patientId) params.set("patientId", filters.patientId);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search) params.set("search", filters.search);

  const response = await apiFetch<PaginatedDto<NotificationDto>>(
    `${BASE}/notifications?${params.toString()}`,
  );
  return { items: response.data.map(mapNotification), total: response.total };
}

async function getCharts(days = 30): Promise<NotificationCharts> {
  const dto = await apiFetch<NotificationChartsDto>(
    `${BASE}/notifications/charts?days=${days}`,
  );
  return {
    alertsBySeverity: dto.alertsBySeverity ?? {},
    alertsByStatus: dto.alertsByStatus ?? {},
    alertsByIndicator: dto.alertsByIndicator ?? {},
    alertsByDay: dto.alertsByDay ?? [],
    notificationsByChannel: dto.notificationsByChannel ?? {},
    notificationsByStatus: dto.notificationsByStatus ?? {},
    notificationsByDay: dto.notificationsByDay ?? [],
  };
}

export interface NotificationsApi {
  listTemplates(filters?: TemplateListFilters): Promise<NotificationTemplate[]>;
  getTemplate(id: string): Promise<NotificationTemplate | null>;
  createTemplate(input: CreateNotificationTemplateInput): Promise<NotificationTemplate>;
  updateTemplate(
    id: string,
    input: NotificationTemplateInput,
  ): Promise<NotificationTemplate>;
  setTemplateActive(id: string, isActive: boolean): Promise<NotificationTemplate>;
  cloneTemplate(
    id: string,
    code: string,
    nameEs?: string,
    nameEn?: string,
  ): Promise<NotificationTemplate>;
  listTemplateVersions(id: string): Promise<NotificationTemplateVersion[]>;
  restoreTemplateVersion(id: string, version: number): Promise<NotificationTemplate>;
  sendTest(templateId: string, input: SendTestInput): Promise<NotifyAlertItemResult>;
  previewTemplate(
    templateId: string,
    input?: TemplatePreviewInput,
  ): Promise<NotificationTemplatePreview>;
  notify(input: NotifyAlertsInput): Promise<NotifyAlertsResult>;
  listNotifications(
    filters?: NotifyAlertsFilters,
  ): Promise<{ items: HealthNotification[]; total: number }>;
  getCharts(days?: number): Promise<NotificationCharts>;
}

export const notificationsApi: NotificationsApi = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  setTemplateActive,
  cloneTemplate,
  listTemplateVersions,
  restoreTemplateVersion,
  sendTest,
  previewTemplate,
  notify,
  listNotifications,
  getCharts,
};

/** Placeholders soportados por el renderizador del backend (para los chips). */
export const NOTIFICATION_PLACEHOLDERS = [
  "paciente",
  "documento",
  "test",
  "indicador",
  "valor",
  "umbral",
  "severidad",
  "accion",
  "profesional",
  "fecha",
] as const;
