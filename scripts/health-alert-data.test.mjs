import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(path, require = () => ({})) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require, URLSearchParams, setTimeout, clearTimeout });
  return exports;
}

const { resolveAlertData, alertPatientName } = loadModule(
  '../features/health-tests/lib/alert-data.ts',
);
const alert = {
  id: 'alert-1', patientId: 'patient-1', patientName: 'Luis Prueba Movil', status: 'activa',
};
const ready = (data) => ({ data, loading: false, error: null });
const failed = { data: null, loading: false, error: 'Intenta de nuevo más tarde.' };
const pending = { data: null, loading: true, error: null };

test('a failed patient directory does not hide real alerts', () => {
  const state = resolveAlertData(ready([alert]), failed, false, {});
  assert.equal(state.error, null);
  assert.equal(state.loading, false);
  assert.equal(state.data.alerts[0].id, alert.id);
  assert.equal(alertPatientName(state.data.alerts[0]), 'Luis Prueba Movil');
  assert.equal(state.data.patients.length, 0);
});

test('the alerts table does not wait for the optional directory', () => {
  const state = resolveAlertData(ready([alert]), pending, false, {});
  assert.equal(state.loading, false);
  assert.equal(state.data.alerts.length, 1);
});

test('an alerts request failure is not represented as an empty result', () => {
  const state = resolveAlertData(failed, ready([]), false, {});
  assert.equal(state.error, failed.error);
  assert.equal(state.data, null);
});

test('loading and genuinely empty results remain distinct', () => {
  assert.equal(resolveAlertData(pending, ready([]), false, {}).loading, true);
  assert.equal(resolveAlertData(pending, ready([]), false, {}).data, null);
  const empty = resolveAlertData(ready([]), failed, false, {});
  assert.equal(empty.error, null);
  assert.equal(empty.data.alerts.length, 0);
});

test('the notification workflow still requires a loaded patient directory', () => {
  const failure = resolveAlertData(ready([alert]), failed, true, {});
  assert.equal(failure.error, failed.error);
  assert.equal(failure.data, null);
  const loading = resolveAlertData(ready([alert]), pending, true, {});
  assert.equal(loading.loading, true);
  assert.equal(loading.data, null);
});

test('status transitions preserve alert names and leave source data untouched', () => {
  const state = resolveAlertData(ready([alert]), ready([]), false, { 'alert-1': 'en-revision' });
  assert.equal(state.data.alerts[0].status, 'en-revision');
  assert.equal(state.data.alerts[0].patientName, alert.patientName);
  assert.equal(alert.status, 'activa');
});

test('patient names prefer the directory, fall back to the alert, and never fabricate a name', () => {
  assert.equal(alertPatientName(alert, { firstName: 'Luis', lastName: 'Prueba Actualizado' }), 'Luis Prueba Actualizado');
  assert.equal(alertPatientName(alert, { firstName: '', lastName: '' }), 'Luis Prueba Movil');
  assert.equal(alertPatientName({ ...alert, patientName: null }), '');
});

test('the real alerts service mapping preserves the backend patient name', async () => {
  const { healthTestsApi } = loadModule('../features/health-tests/services/health-tests-service.ts', (id) => {
    if (id === '@/lib/config/env') return { env: { apiUrl: 'https://erp.example' } };
    if (id === '@/lib/api/http') return { apiFetch: async (url) => {
      assert.equal(url, 'https://erp.example/api/v1/health-tests/alerts?page=1&pageSize=100');
      return { data: [{
        ...alert, ruleId: 'rule-1', ruleName: 'Test de prueba', severity: 'High',
        title: 'Alerta de prueba', body: 'Resultado de prueba', status: 'Active',
        createdAt: '2026-10-08T12:00:00Z',
      }] };
    } };
    if (id === '../lib/domain') return {};
    throw new Error(`Unexpected import: ${id}`);
  });
  const alerts = await healthTestsApi.listAlerts();
  assert.equal(alerts[0].patientName, 'Luis Prueba Movil');
  assert.equal(alertPatientName(alerts[0]), 'Luis Prueba Movil');
});
