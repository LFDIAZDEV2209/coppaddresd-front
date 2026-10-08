import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function service(apiFetch) {
  const source = readFileSync(new URL('../features/agents/services/agents-service.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URLSearchParams, require: (id) => {
    if (id === '@/lib/config/env') return { env: { apiUrl: 'https://erp.example' } };
    if (id === '@/lib/api/http') return { apiFetch };
    if (id === 'lucide-react') return {};
    throw new Error(`Unexpected import: ${id}`);
  } });
  return exports;
}

test('retry uses the existing document endpoint and gives indexing time to finish', async () => {
  const document = { id: 'document-1', status: 'Listo', chunksCount: 4 };
  const api = service(async (url, options) => {
    assert.equal(url, 'https://erp.example/api/v1/agents/documents/document-1/retry');
    assert.equal(options.method, 'POST');
    assert.equal(options.timeoutMs, 180_000);
    assert.equal(options.body, undefined);
    return document;
  });
  assert.equal(await api.retryDocument('document-1'), document);
});

test('registration also avoids the generic 30-second timeout', async () => {
  const input = { fileName: 'guide.md', storageKey: 'agents/guide.md' };
  const api = service(async (url, options) => {
    assert.equal(url, 'https://erp.example/api/v1/agents/knowledge-bases/kb-1/documents');
    assert.deepEqual(JSON.parse(options.body), input);
    assert.equal(options.timeoutMs, 180_000);
    return { id: 'document-1', status: 'Listo' };
  });
  assert.equal((await api.registerDocument('kb-1', input)).status, 'Listo');
});

test('busy or failed indexing remains an error, never a fabricated success', async () => {
  const error = new Error('409: another index attempt is active');
  const api = service(async () => { throw error; });
  await assert.rejects(api.retryDocument('document-1'), (caught) => caught === error);
});
