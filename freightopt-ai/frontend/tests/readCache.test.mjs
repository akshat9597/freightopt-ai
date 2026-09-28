import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

// Compile the production cache with a controllable HTTP transport; no test server required.
async function setup() {
  const source = (await readFile(new URL('../src/services/readCache.ts', import.meta.url), 'utf8'))
    .replace('import { api } from "./api";', 'const api = globalThis.testApi;');
  const storage = new Map();
  globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  globalThis.window = new globalThis.EventTarget();
  let calls = 0;
  globalThis.testApi = { defaults: { baseURL: 'https://test/api' }, get: async () => {
    calls++;
    return { data: { rate: 27 }, headers: { 'content-type': 'application/json' } };
  }};
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${Math.random()}`);
  return { module, storage, calls: () => calls };
}

test('concurrent reads share one request and save real API results', async () => {
  const { module: m, calls } = await setup();
  const result = await Promise.all([m.fetchRead('/dashboard'), m.fetchRead('/dashboard')]);
  assert.equal(calls(), 1);
  assert.deepEqual(result[0], { rate: 27 });
  assert.deepEqual(m.cachedRead('/dashboard').data, { rate: 27 });
});

test('timeout preserves successful cache and connection status recovers', async () => {
  const { module: m } = await setup();
  await m.fetchRead('/dashboard');
  globalThis.testApi.get = async () => { throw new Error('timeout'); };
  await assert.rejects(m.fetchRead('/dashboard'), /timeout/);
  assert.equal(m.connectionDegraded(), true);
  assert.equal(m.cachedRead('/dashboard').data.rate, 27);
  globalThis.testApi.get = async () => ({ data: { rate: 28 }, headers: { 'content-type': 'application/json' } });
  await m.fetchRead('/dashboard');
  assert.equal(m.connectionDegraded(), false);
  assert.equal(m.cachedRead('/dashboard').data.rate, 28);
});

test('HTML errors cannot become cached API results', async () => {
  const { module: m } = await setup();
  globalThis.testApi.get = async () => ({ data: '<html>Waking up</html>', headers: { 'content-type': 'text/html' } });
  await assert.rejects(m.fetchRead('/dashboard'), /invalid response/);
  assert.equal(m.cachedRead('/dashboard'), null);
});

test('expired and broken storage are ignored', async () => {
  const { module: m, storage } = await setup();
  storage.set('freightopt-read-v1:https://test/api:/dashboard', JSON.stringify({ savedAt: Date.now() - 86400001, data: { rate: 27 } }));
  assert.equal(m.cachedRead('/dashboard'), null);
  storage.set('freightopt-read-v1:https://test/api:/dashboard', 'invalid JSON');
  assert.equal(m.cachedRead('/dashboard'), null);
});
