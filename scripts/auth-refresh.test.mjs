import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client(fetch) {
  const source = readFileSync(new URL('../lib/api/http.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({ env: { apiUrl: 'https://erp.example' } }),
    fetch, Headers, AbortController, setTimeout: (fn) => setTimeout(fn, 0), clearTimeout });
  return exports;
}

test('refresh sends valid JSON with cookies and restores the in-memory token', async () => {
  const api = client(async (url, options) => {
    assert.equal(url, 'https://erp.example/api/auth/refresh');
    assert.equal(options.credentials, 'include');
    assert.deepEqual(JSON.parse(options.body), {});
    return new Response(JSON.stringify({ accessToken: 'test-token' }), { status: 200 });
  });
  assert.equal((await api.refreshAccessToken()).ok, true);
  assert.equal(api.getAccessToken(), 'test-token');
});

test('concurrent refresh calls share a request', async () => {
  let count = 0;
  const api = client(async () => { count++; return new Response(JSON.stringify({ accessToken: 'test-token' })); });
  await Promise.all([api.refreshAccessToken(), api.refreshAccessToken()]);
  assert.equal(count, 1);
});

test('cookie rotation retry also sends a valid JSON body', async () => {
  let count = 0;
  const api = client(async (_, options) => {
    assert.deepEqual(JSON.parse(options.body), {});
    return ++count === 1 ? new Response('', { status: 401 })
      : new Response(JSON.stringify({ accessToken: 'rotated-token' }));
  });
  assert.equal((await api.refreshAccessToken()).ok, true);
  assert.equal(count, 2);
});
