// Smoke test against a running site (local `npm run dev:cloudflare` or the live URL).
// Asks a few known questions to /api/chat (v1) and /api/compare (v2) and saves the
// raw outputs. These are observations, not a quality score.
//
//   node scripts/smoke.mjs                         (http://localhost:8788)
//   node scripts/smoke.mjs https://my-portfolio-4xu.pages.dev
import { writeFile, mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://localhost:8788').replace(/\/$/, '');
const questions = [
  'Which projects used MobileNetV2?',
  'How does the scanner login stop people from just typing a password?',
  'How many engineers did Iqmal manage?',
];

async function post(path, body) {
  const t0 = Date.now();
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, ms: Date.now() - t0, body: await res.json().catch(() => null) };
}

const out = { base, run_at: new Date().toISOString(), results: [] };
let failures = 0;
for (const q of questions) {
  const v1 = await post('/api/chat', { message: q });
  const v2 = await post('/api/compare', { question: q });
  const ok = v1.status === 200 && v2.status === 200 && v2.body?.results?.hybrid_rag?.answer && v2.body?.results?.structure_rag?.answer;
  if (!ok) failures++;
  out.results.push({ question: q, v1, v2 });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${q}  (v1 ${v1.status} ${v1.ms}ms, v2 ${v2.status} ${v2.ms}ms)`);
}
const bad = await post('/api/compare', { question: 'x'.repeat(401) });
console.log(`${bad.status === 400 ? 'OK  ' : 'FAIL'} over-long question rejected (${bad.status})`);
if (bad.status !== 400) failures++;

await mkdir(new URL('../eval/', import.meta.url), { recursive: true });
await writeFile(new URL('../eval/smoke-latest.json', import.meta.url), JSON.stringify(out, null, 2));
process.exit(failures ? 1 : 0);
