"use client";

/* eslint-disable react-hooks/static-components -- iconos derivados de categoría/test son valores estables, no crean estado */
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  HeartPulse,
  Layers,
  MessageSquareText,
  Repeat,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  Activity,
  Target,
  User,
  FileWarning,
  Zap,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { useEvaluationDetail } from "../../hooks/use-health-tests";
import { formatDate, formatShortDate } from "../../lib/format";
import { categoryAccent, scoreBarColor } from "../shared/colors";
import { RiskBadge, TestStateBadge } from "../shared/badges";
import { ProgressRing } from "../shared/progress";
import { ChartCardSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import type { EvaluationDetail } from "../../types";

/**
 * Detalle individual de una evaluación: resumen del resultado, secciones,
 * respuestas, comentarios y comparativa histórica de intentos.
 * Versión enriquecida con iconografía por tipo de resultado y estética
 * alineada al análisis IA móvil (ANTARES).
 */
export function EvaluationDetailPage({
  patientId,
  evaluationId,
}: {
  patientId: string;
  evaluationId: string;
}) {
  const t = useT();
  const { detail, loading, error, notFound, reload } = useEvaluationDetail(
    patientId,
    evaluationId,
  );

  if (loading && !detail) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <ChartCardSkeleton height="h-[220px]" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleEmptyState
          title={t("No encontramos esta evaluación")}
          description={t(
            "La evaluación no existe o no pertenece a este paciente.",
          )}
        />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={detail.testName}
        description={t("Detalle del resultado de la evaluación")}
        icon={ClipboardCheck}
        actions={
          <Link
            href={`/health-tests/pacientes/${patientId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            <ArrowLeft data-icon="inline-start" className="size-3.5" />
            {t("Volver al paciente")}
          </Link>
        }
      />

      <EvaluationSummary detail={detail} />
      <EvaluationMeta detail={detail} />

      {detail.attempts.length > 1 ? (
        <AttemptsComparison detail={detail} />
      ) : null}

      <ResultSections detail={detail} />
      <ResponsesSection detail={detail} />
      <CommentsSection detail={detail} />
    </div>
  );
}

/** Resumen del resultado: score destacado + clasificación + metadatos clave. */
function EvaluationSummary({ detail }: { detail: EvaluationDetail }) {
  const t = useT();
  const scoreResult = detail.results.find((r) => r.resultType === "score");
  const severity = scoreResult?.severity ?? null;
  const accent = categoryAccent(detail.testCategory);
  const isCompleted = detail.status === "completed";
  const IconCat = iconForCategory(detail.testCategory);

  return (
    <section className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          background:
            "radial-gradient(520px 200px at 10% 0%, var(--primary) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex items-center gap-4">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-xl ring-1 ring-inset"
          style={{
            backgroundColor: `${accent}14`,
            color: accent,
            borderColor: `${accent}20`,
          }}
        >
          <IconCat className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              {detail.testName}
            </h2>
            <TestStateBadge
              state={
                isCompleted
                  ? "completado"
                  : detail.status === "started"
                    ? "en-progreso"
                    : "pendiente"
              }
              label={t(
                detail.status === "completed"
                  ? "Completado"
                  : detail.status === "started"
                    ? "En progreso"
                    : "Abandonado",
              )}
            />
            {detail.attempt > 1 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-info ring-1 ring-info/15"
                style={{ backgroundColor: "var(--info-soft)" }}
              >
                <Repeat className="size-3" />
                {t("Intento")} {detail.attempt}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {formatDate(detail.completedAt ?? detail.startedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="size-3" />
              {t("Versión")} {detail.versionNumber}
              {detail.versionName ? ` · ${detail.versionName}` : ""}
            </span>
            {detail.testCode ? (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {detail.testCode}
                {detail.testCategory ? ` · ${detail.testCategory}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {isCompleted && detail.score !== null ? (
        <div className="relative flex shrink-0 items-center gap-4">
          <ProgressRing
            value={Math.round(detail.scorePercentage ?? detail.score)}
            size={92}
            stroke={9}
            color={scoreBarColor(riskFromSeverity(severity))}
            label={t("Score")}
          />
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Trophy className="size-3 text-amber-500" />
              {scoreResult?.label ?? t("Score")}
            </span>
            <span className="flex items-baseline gap-1.5 text-lg font-bold text-foreground">
              {detail.scorePercentage !== null
                ? `${detail.scorePercentage}%`
                : `${detail.score} pts`}
              <Star className="size-3.5 text-amber-400" />
            </span>
            {severity ? (
              <RiskBadge
                risk={riskFromSeverity(severity)}
                label={scoreResult?.qualifier ?? t(riskFromSeverity(severity))}
                className="shadow-sm"
              />
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {scoreResult?.qualifier}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex shrink-0 items-center gap-2 rounded-xl bg-muted px-4 py-3 text-[12px] text-muted-foreground">
          <Timer className="size-4" />
          {detail.status === "started"
            ? `${t("Evaluación en curso desde")} ${formatDate(detail.startedAt)}`
            : t("Evaluación sin resultados")}
        </div>
      )}
    </section>
  );
}

/** Metadatos técnicos de la evaluación. */
function EvaluationMeta({ detail }: { detail: EvaluationDetail }) {
  const t = useT();
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Clock className="size-3.5" />,
      label: t("Inicio"),
      value: formatDate(detail.startedAt),
    },
    {
      icon: <CalendarClock className="size-3.5" />,
      label: t("Finalización"),
      value: detail.completedAt ? formatDate(detail.completedAt) : "—",
    },
    {
      icon: <Layers className="size-3.5" />,
      label: t("Versión"),
      value: `${detail.versionNumber}${detail.versionName ? ` · ${detail.versionName}` : ""}`,
    },
    {
      icon: <BarChart3 className="size-3.5" />,
      label: t("Estrategia de scoring"),
      value: detail.scoringStrategy,
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 shadow-sm sm:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1 bg-card p-4">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {row.icon}
            {row.label}
          </span>
          <span className="text-[12.5px] font-semibold text-foreground">
            {row.value}
          </span>
        </div>
      ))}
    </section>
  );
}

/** Resultados agrupados por tipo (score, subescalas, indicadores) — ahora con iconografía por tipo. */
function ResultSections({ detail }: { detail: EvaluationDetail }) {
  const t = useT();
  const score = detail.results.find((r) => r.resultType === "score");
  const subscales = detail.results.filter((r) => r.resultType === "subscale");
  const indicators = detail.results.filter((r) => r.resultType === "indicator");
  const accent = categoryAccent(detail.testCategory);

  if (detail.results.length === 0) {
    return (
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <SectionHeader
          title={t("Resultados")}
          description={t("Resultados calculados de la evaluación")}
          icon={Award}
          variant="primary"
        />
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <FileWarning className="size-5" />
          </span>
          <p className="text-xs text-muted-foreground">
            {t("Esta evaluación aún no tiene resultados calculados.")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <SectionHeader
        title={t("Resultados")}
        description={t(
          "Valores, clasificación y severidad por sección — iconografía por tipo de resultado",
        )}
        icon={Award}
        variant="primary"
      />

      {/* Score destacado en hero si existe */}
      {score ? (
        <div
          className="relative flex items-center gap-4 border-b border-border bg-gradient-to-r from-card to-muted/20 px-5 py-4"
          style={{ borderLeft: `3px solid ${accent}` }}
        >
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ring-inset"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Trophy className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-amber-500/15">
                <Sparkles className="size-3" />
                {t("Score total")}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {score.code}
              </span>
            </div>
            <div className="mt-1 text-sm font-bold text-foreground">
              {score.label}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {score.qualifier ?? t("Resultado global del instrumento")}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-lg font-bold text-foreground">
              {score.value}{" "}
              <span className="text-[11px] font-medium text-muted-foreground">
                pts
              </span>
            </span>
            {score.severity ? (
              <RiskBadge
                risk={riskFromSeverity(score.severity)}
                label={score.qualifier ?? t(riskFromSeverity(score.severity))}
                className="text-[11px]"
              />
            ) : score.qualifier ? (
              <span className="text-[11px] text-muted-foreground">
                {score.qualifier}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Subescalas */}
      {subscales.length > 0 ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 bg-muted/30 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <Layers className="size-3.5 text-primary" />
            {t("Subescalas")} · {subscales.length}
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            {subscales.map((r) => (
              <ResultRow
                key={r.id}
                label={r.label}
                value={r.value}
                qualifier={r.qualifier}
                severity={r.severity}
                code={r.code}
                icon={Brain}
                accent={accent}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Indicadores */}
      {indicators.length > 0 ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 bg-muted/30 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <Activity className="size-3.5 text-primary" />
            {t("Indicadores")} · {indicators.length}
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            {indicators.map((r) => (
              <ResultRow
                key={r.id}
                label={r.label}
                value={r.value}
                qualifier={r.qualifier}
                severity={r.severity}
                code={r.code}
                icon={TrendingUp}
                accent={accent}
              />
            ))}
          </div>
        </div>
      ) : null}

      {subscales.length === 0 && indicators.length === 0 && !score ? (
        <div className="px-5 py-6">
          <ResultRow
            label={t("Score total")}
            value={detail.score}
            qualifier={null}
            severity={null}
            code={detail.testCode}
            icon={Trophy}
            accent={accent}
          />
        </div>
      ) : null}
    </section>
  );
}

function ResultRow({
  label,
  value,
  qualifier,
  severity,
  code,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | null;
  qualifier: string | null;
  severity: string | null;
  code: string;
  icon: typeof Trophy;
  accent: string;
}) {
  const t = useT();
  const risk = severity ? riskFromSeverity(severity) : null;
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/20">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
          style={{
            backgroundColor: `${accent}12`,
            color: accent,
            borderColor: `${accent}18`,
          }}
        >
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-foreground">
            {label}
            {severity === "critical" || severity === "critica" ? (
              <Zap className="size-3 shrink-0 text-destructive" />
            ) : null}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              {code}
            </span>
            {qualifier && !severity ? (
              <span className="truncate">{qualifier}</span>
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="flex items-center gap-1 text-[13px] font-bold text-foreground">
          <BarChart3 className="size-3 text-muted-foreground" />
          {value !== null ? value : "—"}
        </span>
        {risk ? (
          <RiskBadge
            risk={risk}
            label={qualifier ?? t(risk)}
            className="shadow-sm"
          />
        ) : qualifier ? (
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {qualifier}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Respuestas registradas agrupadas por sección de preguntas. */
function ResponsesSection({ detail }: { detail: EvaluationDetail }) {
  const t = useT();
  if (detail.responses.length === 0) return null;

  const groups = new Map<string, typeof detail.responses>();
  for (const r of detail.responses) {
    const key = r.section ?? t("Sin sección");
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <SectionHeader
        title={t("Respuestas")}
        description={t("Respuestas registradas por el paciente")}
        icon={FileText}
        variant="primary"
      />
      <div className="flex flex-col divide-y divide-border">
        {[...groups.entries()].map(([section, responses]) => (
          <div key={section} className="flex flex-col">
            <h4 className="flex items-center gap-1.5 bg-muted/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <Target className="size-3 text-primary" />
              {section}
              <span className="ml-1 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                {responses.length}
              </span>
            </h4>
            <ul className="flex flex-col divide-y divide-border/70">
              {responses.map((r) => (
                <li
                  key={r.questionId}
                  className="flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-muted/20"
                >
                  <span className="flex items-start gap-1.5 text-[12.5px] leading-snug text-foreground">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/40" />
                    {r.questionText}
                    <span className="ml-1 rounded bg-muted px-1 py-0 text-[10px] font-mono text-muted-foreground">
                      {r.questionCode}
                    </span>
                  </span>
                  <span className="ml-2.5 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-primary">
                    <CheckCircle2 className="size-3 shrink-0" />
                    {r.answerOptionText ?? r.valueText ?? t("Sin respuesta")}
                    {r.answerOptionScore !== null &&
                    r.answerOptionScore !== undefined ? (
                      <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary ring-1 ring-primary/15">
                        {r.answerOptionScore} pts
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Comentarios de profesionales sobre la evaluación. */
function CommentsSection({ detail }: { detail: EvaluationDetail }) {
  const t = useT();
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <SectionHeader
        title={t("Comentarios")}
        description={t("Historial de revisión de la evaluación")}
        icon={MessageSquareText}
        variant="primary"
      />
      {detail.comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <MessageSquareText className="size-4" />
          </span>
          <p className="text-xs text-muted-foreground">
            {t("Sin comentarios para esta evaluación.")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {detail.comments.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 px-5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <User className="size-3" />
                  {t("Profesional")}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  {formatDate(c.createdAt)}
                </span>
              </div>
              <p className="rounded-xl bg-muted/30 px-3 py-2 text-[12.5px] leading-relaxed text-foreground">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Comparativa de intentos del mismo test (solo cuando hay más de uno). */
function AttemptsComparison({ detail }: { detail: EvaluationDetail }) {
  const t = useT();
  const attempts = [...detail.attempts].sort((a, b) =>
    (a.completedAt ?? a.startedAt).localeCompare(b.completedAt ?? b.startedAt),
  );

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <SectionHeader
        title={t("Historial de intentos")}
        description={t("Progresión del mismo test en el tiempo")}
        icon={Repeat}
        variant="primary"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2.5 font-semibold">{t("Intento")}</th>
              <th className="px-5 py-2.5 font-semibold">{t("Fecha")}</th>
              <th className="px-5 py-2.5 font-semibold">{t("Estado")}</th>
              <th className="px-5 py-2.5 font-semibold">{t("Resultado")}</th>
              <th className="px-5 py-2.5 font-semibold" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {attempts.map((a, i) => {
              const isCurrent = a.id === detail.id;
              const severity = detail.results.find(
                (r) => r.resultType === "score",
              )?.severity;
              return (
                <tr
                  key={a.id}
                  className={
                    isCurrent
                      ? "bg-primary-soft/40"
                      : "bg-card hover:bg-muted/20"
                  }
                >
                  <td className="px-5 py-3 text-[12.5px] font-bold text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{
                          backgroundColor: isCurrent
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                        }}
                      >
                        {i + 1}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {t("Actual")}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-foreground">
                    {formatShortDate(a.completedAt ?? a.startedAt)}
                  </td>
                  <td className="px-5 py-3">
                    <TestStateBadge
                      state={
                        a.status === "completed"
                          ? "completado"
                          : a.status === "started"
                            ? "en-progreso"
                            : "pendiente"
                      }
                      label={t(
                        a.status === "completed"
                          ? "Completado"
                          : a.status === "started"
                            ? "En progreso"
                            : "Abandonado",
                      )}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground">
                      {a.score !== null ? (
                        <>
                          <Trophy className="size-3 text-amber-500" />
                          {a.scorePercentage !== null
                            ? `${Math.round(a.scorePercentage)}%`
                            : `${a.score} pts`}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {a.score !== null && severity ? (
                      <RiskBadge
                        risk={riskFromSeverity(severity)}
                        className="px-2 py-0.5 text-[10.5px]"
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function iconForCategory(category: string | null) {
  const map: Record<string, typeof ClipboardCheck> = {
    "historia-clinica": ClipboardCheck,
    nutricion: Activity,
    movimiento: Activity,
    sueno: Clock,
    adherencia: HeartPulse,
    "salud-mental": Brain,
    cardiometabolico: Activity,
  };
  return map[category ?? ""] ?? ClipboardCheck;
}

function riskFromSeverity(severity: string | null) {
  if (severity === "critical" || severity === "critica")
    return "critico" as const;
  if (severity === "high" || severity === "alta") return "alto" as const;
  if (severity === "moderate" || severity === "media")
    return "moderado" as const;
  return "bajo" as const;
}
