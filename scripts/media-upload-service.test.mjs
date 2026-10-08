import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function service(outcomes) {
  const requests = [];
  class XHR {
    upload = {};
    headers = {};
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(file) {
      requests.push({ url: this.url, headers: this.headers, file });
      const outcome = outcomes.shift();
      if (outcome === 'network') this.onerror();
      else { this.status = outcome; this.onload(); }
    }
  }
  const code = ts.transpileModule(readFileSync(new URL('../features/media/services/upload-service.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URL, XMLHttpRequest: XHR, encodeURIComponent, require: (id) => {
    if (id === '@/lib/config/env') return { env: { apiUrl: 'https://erp.example' } };
    if (id === '@/lib/api/http') return {
      getAccessToken: () => 'qa-token',
      apiFetch: async () => ({ storageKey: 'media/audio/test.mp3', presignedUrl: 'https://bucket.s3.amazonaws.com/test?X-Amz-Signature=qa' }),
    };
    throw new Error(`Unexpected import: ${id}`);
  } });
  return { api: exports, requests };
}
const file = { name: 'test.mp3', type: 'audio/mpeg' };

test('direct upload succeeds without sending the ERP token to S3', async () => {
  const { api, requests } = service([200]);
  const result = await api.resolveStorageKeys({ contentType: file.type }, file);
  assert.equal(result.storageKey, 'media/audio/test.mp3');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.Authorization, undefined);
});
test('network failure retries the same object through authenticated gateway', async () => {
  const { api, requests } = service(['network', 204]);
  const result = await api.resolveStorageKeys({ contentType: file.type }, file);
  assert.equal(result.storageKey, 'media/audio/test.mp3');
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, 'https://erp.example/api/v1/storage/media/audio/test.mp3');
  assert.equal(requests[1].headers.Authorization, 'Bearer qa-token');
  assert.equal(requests[1].file, file);
});
test('HTTP rejection remains an error without gateway fallback', async () => {
  const { api, requests } = service([403]);
  await assert.rejects(api.resolveStorageKeys({ contentType: file.type }, file), /403/);
  assert.equal(requests.length, 1);
});
test('gateway failure preserves failure and never returns a media key', async () => {
  const { api, requests } = service(['network', 500]);
  await assert.rejects(api.resolveStorageKeys({ contentType: file.type }, file), /500/);
  assert.equal(requests.length, 2);
});
