import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function loadDomain(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { riskFromSeverity, completedInDateOrder } = await loadDomain("../features/health-tests/lib/evaluation-results.ts");
const { patientRisk, typifyPatient } = await loadDomain("../features/health-tests/lib/domain.ts");
const result = (score, severity) => ({ score, state: "completado", risk: riskFromSeverity(severity) });
test("puntajes en escalas distintas conservan la clasificación del instrumento", () => {
  assert.equal(patientRisk([result(3, "high")]), "alto");
  assert.equal(patientRisk([result(91, "low")]), "bajo");
});
test("un puntaje sin severidad no se convierte en riesgo bajo", () => {
  assert.equal(patientRisk([result(20, null), result(90, undefined)]), "sin-evaluar");
  assert.equal(riskFromSeverity("unclassified"), "sin-evaluar");
});
test("una clasificación crítica persistida no requiere puntaje numérico", () => {
  assert.equal(patientRisk([result(null, "critical"), result(7, "low")]), "critico");
});
test("cinco resultados sin clasificar no tipifican al paciente como bajo riesgo", () => {
  assert.equal(typifyPatient({ results: Array.from({ length: 5 }, () => result(1, null)) }), "evaluacion-completa");
});
test("historial descendente de API selecciona la última fecha, no el último elemento", () => {
  const old = { id: "old", status: "completed", startedAt: "2026-09-22T10:00:00Z", completedAt: "2026-09-22T10:05:00Z" };
  const latest = { id: "latest", status: "completed", startedAt: "2026-10-08T10:00:00Z", completedAt: "2026-10-08T10:05:00Z" };
  const pending = { id: "pending", status: "started", startedAt: "2026-10-09T10:00:00Z", completedAt: null };
  const input = [latest, pending, old];
  assert.deepEqual(completedInDateOrder(input).map((row) => row.id), ["old", "latest"]);
  assert.deepEqual(input.map((row) => row.id), ["latest", "pending", "old"]);
});
test("fechas con zonas distintas se ordenan por instante real", () => {
  const input = [
    { id: "later", status: "completed", startedAt: "2026-10-08T09:00:00-05:00", completedAt: null },
    { id: "earlier", status: "completed", startedAt: "2026-10-08T13:00:00Z", completedAt: null },
  ];
  assert.equal(completedInDateOrder(input).at(-1).id, "later");
});
