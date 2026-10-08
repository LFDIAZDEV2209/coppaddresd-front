import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../features/health-tests/lib/indicator-aggregates.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { aggregatePatientRisks } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const catalog = [
  { code: "a", category: "cardiometabolico", name: "A", icon: "" },
  { code: "b", category: "cardiometabolico", name: "B", icon: "" },
];
const result = (code, risk, at = "2026-10-08T00:00:00Z", history = []) => ({ testCode: code, state: "completado", risk, completedAt: at, history });
const row = (id, results) => ({ patient: { id, results } });
test("cuenta una persona una vez aunque tenga varios resultados de riesgo y filas repetidas", () => {
  const patient = row("p1", [result("a", "alto"), result("b", "critico")]);
  const [aggregate] = aggregatePatientRisks([patient, patient, row("p2", [result("a", "bajo")]), row("p3", [])], catalog);
  assert.equal(aggregate.affectedCount, 1);
  assert.equal(aggregate.evaluatedCount, 2);
  assert.deepEqual(aggregate.distribution, { bajo: 1, moderado: 0, alto: 0, critico: 1, "sin-evaluar": 1 });
  assert.equal(aggregate.average, 50);
});
test("la severidad actual usa la evaluación más reciente del instrumento entre versiones", () => {
  const [aggregate] = aggregatePatientRisks([row("p", [result("a", "critico", "2026-09-01"), result("a", "bajo", "2026-10-08")])], catalog);
  assert.equal(aggregate.affectedCount, 0);
  assert.deepEqual(aggregate.trend, [{ label: "2026-09", value: 100 }, { label: "2026-10", value: 0 }]);
});
test("no inventa meses ni tendencias; conserva última evaluación mensual por persona", () => {
  const [aggregate] = aggregatePatientRisks([row("p", [result("a", "bajo", "2026-10-08", [
    { completedAt: "2026-10-01", risk: "alto", score: 9 },
    { completedAt: "2026-10-08", risk: "bajo", score: 3 },
  ])])], catalog);
  assert.deepEqual(aggregate.trend, [{ label: "2026-10", value: 0 }]);
  assert.equal(aggregate.evaluationCount, 2);
  assert.deepEqual(aggregatePatientRisks([row("empty", [])], catalog)[0].trend, []);
});
