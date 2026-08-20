/**
 * Blocks outbound network calls in the unit test suite.
 *
 * Unit tests must not depend on external services: they make CI results hinge
 * on third-party availability and account quota, and — for metered APIs like
 * Volcengine TTS/ASR and the AI provider — they spend real money on every run.
 *
 * Loaded via `node --import` from scripts/run-tests.js so it applies to every
 * unit test file, including the ones that don't import tests/testSetup.js.
 *
 * Local traffic stays allowed: supertest binds an ephemeral loopback port and
 * the MySQL integration suite talks to a local server.
 */
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);

function isLocalHostname(hostname) {
  return LOCAL_HOSTNAMES.has(String(hostname || '').replace(/^\[|\]$/g, ''));
}

function blocked(target) {
  return new Error(
    `[no-network] 单元测试尝试访问外部网络：${target}\n` +
    '单元测试不得调用真实外部服务（会依赖第三方可用性，且计费接口会产生真实费用）。\n' +
    '请用 t.mock.method() / mock.module() 打桩，或把该用例改成 .http.test.js 并显式声明依赖。'
  );
}

const originalFetch = globalThis.fetch;
// Rejects rather than throwing synchronously, so guarded code fails at the same
// point a real network error would and existing try/catch paths behave normally.
globalThis.fetch = async function guardedFetch(input, init) {
  const url = typeof input === 'string' || input instanceof URL
    ? new URL(String(input))
    : new URL(input.url);
  if (!isLocalHostname(url.hostname)) {
    throw blocked(url.origin + url.pathname);
  }
  return originalFetch.call(this, input, init);
};

// Hostname filtering alone cannot catch a unit test reaching the local MySQL
// server: it lives on 127.0.0.1, which the rules above deliberately allow. No
// unit test opens a socket of its own, so in the `unit` category we block TCP
// outright — otherwise an unstubbed db.prepare() silently connects for real and
// the test process hangs on an open pool handle instead of failing.
// The `all` category still runs http/mysql suites, which need real sockets, so
// it only gets the outbound-HTTP guard above.
if (process.env.NEST_TEST_ISOLATION === 'strict') {
  const originalConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function guardedConnect(...args) {
    const [options] = args;
    const port = typeof options === 'object' ? options?.port : args[0];
    throw blocked(`tcp://…:${port ?? '?'}（单元测试不应打开任何套接字，常见原因是未 stub 的数据库查询）`);
  };
  net.connect = net.createConnection = function guardedCreateConnection(...args) {
    const socket = new net.Socket();
    return socket.connect(...args);
  };
  // Keep a reference so the patch is obviously reversible if ever needed.
  net.Socket.prototype.connect.__original = originalConnect;
}

for (const [mod, name] of [[http, 'http'], [https, 'https']]) {
  const originalRequest = mod.request;
  mod.request = function guardedRequest(...args) {
    const [first] = args;
    const hostname = typeof first === 'string' || first instanceof URL
      ? new URL(String(first)).hostname
      : (first?.hostname ?? first?.host ?? '');
    if (!isLocalHostname(String(hostname).split(':')[0])) {
      throw blocked(`${name}://${hostname}`);
    }
    return originalRequest.apply(this, args);
  };
}
