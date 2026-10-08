import type { ClinicalIndicator, HealthTest, IndicatorAggregate, PatientMasterRow, RiskLevel } from "../types";

const order: RiskLevel[] = ["sin-evaluar", "bajo", "moderado", "alto", "critico"];
const worstRisk = (risks: RiskLevel[]) => risks.reduce((worst, risk) => order.indexOf(risk) > order.indexOf(worst) ? risk : worst, "sin-evaluar" as RiskLevel);
const high = (risk: RiskLevel) => risk === "alto" || risk === "critico";

/** Una persona ocupa un solo nivel por categoría, usando la severidad persistida más alta.
 * La tendencia mide prevalencia mensual observada, nunca offsets sobre el valor actual.
 */
export function aggregatePatientRisks(rows: PatientMasterRow[], tests: HealthTest[]): IndicatorAggregate[] {
  const patients = [...new Map(rows.map(row => [row.patient.id, row])).values()];
  return [...new Set(tests.map(test => test.category))].map(category => {
    const categoryTests = tests.filter(test => test.category === category);
    const codes = new Set(categoryTests.map(test => test.code));
    const distribution = { bajo: 0, moderado: 0, alto: 0, critico: 0, "sin-evaluar": 0 };
    const affectedPatientIds: string[] = [], evaluatedPatientIds: string[] = [];
    let evaluationCount = 0;
    const monthly = new Map<string, Map<string, Map<string, { at: string; risk: RiskLevel }>>>();
    for (const { patient } of patients) {
      const results = patient.results.filter(result => result.testCode && codes.has(result.testCode) && result.state === "completado");
      evaluationCount += results.reduce((sum, result) => sum + (result.history.length || 1), 0);
      const latestByTest = new Map<string, typeof results[number]>();
      for (const result of results) {
        const previous = latestByTest.get(result.testCode!);
        if (!previous || Date.parse(result.completedAt ?? result.updatedAt) > Date.parse(previous.completedAt ?? previous.updatedAt)) latestByTest.set(result.testCode!, result);
      }
      const risk = worstRisk([...latestByTest.values()].map(result => result.risk));
      distribution[risk]++;
      if (results.length) evaluatedPatientIds.push(patient.id);
      if (high(risk)) affectedPatientIds.push(patient.id);
      for (const result of results) {
        const history = result.history.length ? result.history : result.completedAt ? [{ completedAt: result.completedAt, risk: result.risk }] : [];
        for (const point of history) {
          if (point.risk === "sin-evaluar" || !Number.isFinite(Date.parse(point.completedAt))) continue;
          const month = point.completedAt.slice(0, 7);
          if (!monthly.has(month)) monthly.set(month, new Map());
          const cohort = monthly.get(month)!;
          if (!cohort.has(patient.id)) cohort.set(patient.id, new Map());
          const byTest = cohort.get(patient.id)!;
          const previous = byTest.get(result.testCode!);
          if (!previous || point.completedAt > previous.at) byTest.set(result.testCode!, { at: point.completedAt, risk: point.risk });
        }
      }
    }
    const evaluatedCount = evaluatedPatientIds.length, affectedCount = affectedPatientIds.length;
    const classified = patients.length - distribution["sin-evaluar"];
    const indicator = {
      id: `cat-${category}`, name: categoryTests[0]?.name ?? category, category,
      icon: categoryTests[0]?.icon ?? "📊", description: "", unit: "%", higherIsBetter: false, ranges: [],
    } satisfies ClinicalIndicator;
    return {
      indicator, distribution, affectedPatientIds, evaluatedPatientIds, evaluationCount, evaluatedCount, affectedCount,
      average: classified > 0 ? Math.round(100 * affectedCount / classified) : 0,
      trend: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([label, cohort]) => ({
        label, value: Math.round(100 * [...cohort.values()].filter(byTest => high(worstRisk([...byTest.values()].map(point => point.risk)))).length / cohort.size),
      })),
    };
  });
}
