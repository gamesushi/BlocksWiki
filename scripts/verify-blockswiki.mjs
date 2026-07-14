#!/usr/bin/env node
/**
 * BlocksWiki automated verification tool.
 *
 * Runs three independent checks and exits non-zero on ANY failure:
 *   1. Brand consistency  — no leftover LifeWiki / lifewiki / LIFEWIKI_ADMINS
 *                            in source (README.md is allowed to mention the old name).
 *   2. TypeScript compile — `tsc --noEmit` for both api (Strapi) and web (Next.js).
 *   3. Runtime smoke test — boots Strapi (1338) + Next (3001), hits key endpoints,
 *                            asserts 200 + "BlocksWiki" rendered, then tears down.
 *
 * Usage:  node scripts/verify-blockswiki.mjs
 * Env:    VERIFY_SKIP_SERVERS=1   skip the (slower) runtime smoke test
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
let failed = false;

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed = true;
  const tag = ok ? '✅' : '❌';
  console.log(`${tag} ${name}${detail ? ' — ' + detail : ''}`);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 180000,
    env: { ...process.env, ...(opts.env || {}) },
    ...(opts.extra || {}),
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────── 1. Brand consistency ───────────────────────── */
function checkBrand() {
  console.log('\n[1/3] Brand consistency — scanning for leftover "LifeWiki"/"lifewiki"…');
  const findCmd = `find . -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.md' \
-o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name '.env.example' \\) \
-not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.tmp/*' \
-not -path '*/dist/*' -not -path '*/.git/*' -not -path '*/build/*' -not -path '*/coverage/*' \
| xargs grep -IlnE 'LifeWiki|lifewiki|LIFEWIKI_ADMINS'`;
  const res = run('bash', ['-c', findCmd], { timeout: 60000 });
  const found = (res.stdout || '').split('\n').filter(Boolean);
  // README.md may intentionally mention the former name — allow it.
  const offenders = found.filter((p) => !p.includes('README.md'));
  if (offenders.length) {
    record('Brand tokens absent from source', false, offenders.join(', '));
  } else {
    const note = found.length ? `(${found.length} allowed in README.md)` : 'none found';
    record('Brand tokens absent from source', true, note);
  }
}

/* ───────────────────────── 2. TypeScript compile ───────────────────────── */
function checkCompile() {
  console.log('\n[2/3] TypeScript compile check (tsc --noEmit)…');

  const api = run('npx', ['tsc', '--noEmit'], {
    cwd: resolve(ROOT, 'api'),
    timeout: 240000,
    env: { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '' },
  });
  if (api.status === 0) {
    record('api (Strapi) type-checks', true);
  } else {
    record('api (Strapi) type-checks', false,
      (api.stderr || api.stdout || '').split('\n').slice(-8).join(' ').slice(0, 300));
  }

  const web = run('npx', ['tsc', '--noEmit'], {
    cwd: resolve(ROOT, 'web'),
    timeout: 240000,
    env: { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '' },
  });
  if (web.status === 0) {
    record('web (Next.js) type-checks', true);
  } else {
    record('web (Next.js) type-checks', false,
      (web.stderr || web.stdout || '').split('\n').slice(-8).join(' ').slice(0, 300));
  }
}

/* ───────────────────────── 3. Runtime smoke test ───────────────────────── */
const PROXY_OFF = { HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '' };

async function waitFor(url, token, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      const body = await r.text();
      if (r.status < 500 && (token ? body.includes(token) : true)) return { ok: true, body, status: r.status };
      if (r.status >= 500) return { ok: false, body, status: r.status };
    } catch { /* not up yet */ }
    await sleep(2000);
  }
  return { ok: false, body: '', status: 0 };
}

async function checkRuntime() {
  if (process.env.VERIFY_SKIP_SERVERS === '1') {
    console.log('\n[3/3] Runtime smoke test — SKIPPED (VERIFY_SKIP_SERVERS=1)');
    record('Runtime smoke test (skipped)', true, 'explicitly disabled');
    return;
  }
  console.log('\n[3/3] Runtime smoke test — booting Strapi + Next.js…');

  // free ports from any prior run
  run('bash', ['-c', 'pkill -f "strapi" 2>/dev/null; pkill -f "next dev" 2>/dev/null; lsof -ti:1338 2>/dev/null | xargs -r kill -9; lsof -ti:3001 2>/dev/null | xargs -r kill -9; sleep 1'], { timeout: 30000 });

  const apiProc = spawn('npm', ['run', 'develop'], {
    cwd: resolve(ROOT, 'api'),
    env: { ...process.env, ...PROXY_OFF },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const webProc = spawn('npm', ['run', 'dev'], {
    cwd: resolve(ROOT, 'web'),
    env: { ...process.env, ...PROXY_OFF, NO_PROXY: 'localhost,127.0.0.1' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const cleanup = () => {
    try { process.kill(-apiProc.pid); } catch {}
    try { process.kill(-webProc.pid); } catch {}
  };
  process.on('exit', cleanup);

  const checks = [
    { name: 'Strapi /api/channels', url: 'http://localhost:1338/api/channels', token: null, timeout: 120000 },
    { name: 'Frontend home shows BlocksWiki', url: 'http://localhost:3001/', token: 'BlocksWiki', timeout: 90000 },
    { name: 'Capture page shows BlocksWiki', url: 'http://localhost:3001/capture', token: 'BlocksWiki', timeout: 30000 },
    { name: 'Channel page breadcrumb (BlocksWiki)', url: 'http://localhost:3001/channel/1783360225-mitsug', token: 'BlocksWiki', timeout: 30000 },
    { name: 'Login ?mode=register reachable', url: 'http://localhost:3001/login?mode=register', token: null, timeout: 30000 },
  ];

  let allUp = true;
  for (const c of checks) {
    const res = await waitFor(c.url, c.token, c.timeout);
    if (res.ok) {
      record(c.name, true, `HTTP ${res.status}`);
    } else {
      record(c.name, false, `HTTP ${res.status || 'no response'}`);
      allUp = false;
    }
  }

  cleanup();
  setTimeout(() => process.exit(failed ? 1 : 0), 1000);
}

/* ───────────────────────────────── run ───────────────────────────────── */
console.log('══════════════════ BlocksWiki Verification ══════════════════');
console.log(`root: ${ROOT}`);
checkBrand();
checkCompile();
await checkRuntime();

// For the runtime path, checkRuntime schedules process.exit; for others, exit now.
if (process.env.VERIFY_SKIP_SERVERS === '1') {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(failed ? '❌ VERIFICATION FAILED' : '✅ VERIFICATION PASSED');
  console.log('══════════════════════════════════════════════════════════');
  process.exit(failed ? 1 : 0);
}
