// Runs the labelled questions through Bot A, Bot B and the v1 full-context bot,
// and scores retrieval and answers separately.
//
//   node --env-file=.env scripts/eval.mjs --split dev            (while developing)
//   node --env-file=.env scripts/eval.mjs --split heldout        (final report only)
//   add --retrieval-only to skip answer generation (cheaper)
//
// Writes eval/results-<split>.json and, for answers, a blind review sheet
// eval/blind-<split>.csv (bots shown as X/Y in random order) + eval/blind-<split>-key.json.
import { readFile, writeFile } from 'node:fs/promises';
import {
  prepareIndex, embed, retrieveHybrid, routeLeaves, passagesForLeaves,
  answerMessages, chat, verifyCitations, isRefusal,
} from '../lib/rag.mjs';
import { onRequestPost as v1Chat } from '../functions/api/chat.js';

const args = process.argv.slice(2);
const split = args.includes('--split') ? args[args.indexOf('--split') + 1] : 'dev';
const withAnswers = !args.includes('--retrieval-only');
const env = process.env;
if (!env.HF_TOKEN) { console.error('HF_TOKEN is not set. Put it in .env and run with --env-file=.env'); process.exit(1); }

const root = new URL('../', import.meta.url);
const idx = prepareIndex(JSON.parse(await readFile(new URL('public/data/kb/index.json', root), 'utf8')));
const gold = JSON.parse(await readFile(new URL('eval/gold.json', root), 'utf8'));
if (gold.source_version !== idx.version) throw new Error(`gold is for ${gold.source_version} but index is ${idx.version}`);
const questions = gold.questions.filter(q => split === 'all' || q.split === split);

// Serve /data/portfolio.json from disk so the unchanged v1 function can run here.
const realFetch = globalThis.fetch;
const portfolioJson = await readFile(new URL('public/data/portfolio.json', root), 'utf8');
globalThis.fetch = (url, opts) => (String(url).endsWith('/data/portfolio.json')
  ? Promise.resolve(new Response(portfolioJson, { headers: { 'Content-Type': 'application/json' } }))
  : realFetch(url, opts));

function uniq(list) { return [...new Set(list)]; }

// Retrieval scores on the first 3 distinct sections (Bot B returns at most 3).
function retrievalScores(ranked, goldIds) {
  const top = ranked.slice(0, 3);
  const firstHit = top.findIndex(id => goldIds.includes(id));
  return {
    hit1: goldIds.includes(top[0]) ? 1 : 0,
    hit3: firstHit >= 0 ? 1 : 0,
    all3: goldIds.every(g => top.includes(g)) ? 1 : 0,
    rr: firstHit >= 0 ? 1 / (firstHit + 1) : 0,
  };
}

async function answerWith(question, passages) {
  const t0 = Date.now();
  const r = await chat(answerMessages(question, passages), env, { maxTokens: 400, temperature: 0.3 });
  const v = verifyCitations(r.content, new Set(passages.map(p => p.section_id)));
  return { ...v, tokens: r.tokens, answer_ms: Date.now() - t0 };
}

async function retry(fn, tries = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries) throw e;
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

const rows = [];
for (const q of questions) {
  const row = { id: q.id, type: q.type, question: q.question, gold: q.gold, must_refuse: !!q.must_refuse };
  const t0 = Date.now();
  const [qvec] = await retry(() => embed([q.question], env, { query: true }));
  const embedMs = Date.now() - t0;

  // Bot A
  const tA = Date.now();
  const aRanked = uniq(retrieveHybrid(idx, q.question, qvec, null, 15).map(p => p.section_id));
  const aPassages = retrieveHybrid(idx, q.question, qvec);
  row.a = { ranked: aRanked.slice(0, 5), retrieval_ms: embedMs + Date.now() - tA };

  // Bot B
  const tB = Date.now();
  const route = await retry(() => routeLeaves(idx, q.question, qvec, env));
  const bPassages = passagesForLeaves(idx, route.leafIds, q.question, qvec);
  row.b = {
    ranked: route.leafIds, router: route.router, invalid_ids: route.invalid,
    router_tokens: route.tokens, retrieval_ms: embedMs + Date.now() - tB,
  };

  if (q.gold.length) {
    row.a.scores = retrievalScores(aRanked, q.gold);
    row.b.scores = retrievalScores(route.leafIds, q.gold);
  }

  if (withAnswers) {
    const ansA = await retry(() => answerWith(q.question, aPassages));
    const ansB = await retry(() => answerWith(q.question, bPassages));
    Object.assign(row.a, ansA, { latency_ms: row.a.retrieval_ms + ansA.answer_ms });
    Object.assign(row.b, ansB, { tokens: ansB.tokens + route.tokens, latency_ms: row.b.retrieval_ms + ansB.answer_ms });
    for (const bot of [row.a, row.b]) {
      bot.refused = isRefusal(bot.answer);
      bot.cites_gold = bot.citations.some(c => q.gold.includes(c)) ? 1 : 0;
    }
    // v1 full-context control (unchanged production code)
    const tV = Date.now();
    const res = await v1Chat({
      request: new Request('http://local/api/chat', { method: 'POST', body: JSON.stringify({ message: q.question }) }),
      env,
    });
    const v1 = await res.json();
    row.v1 = { answer: v1.response, latency_ms: Date.now() - tV };
  }
  rows.push(row);
  process.stdout.write(`${q.id} A:${row.a.ranked[0]} B:${row.b.ranked.join(',')}${row.b.router !== 'llm' ? ' (fallback)' : ''}\n`);
}
globalThis.fetch = realFetch;

// ---- Summaries ----
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const r3 = x => (x == null ? null : Math.round(x * 1000) / 1000);

function summarise(list, bot) {
  const scored = list.filter(r => r[bot].scores);
  const out = {
    n: list.length,
    retrieval_scored: scored.length,
    recall_at_1: r3(mean(scored.map(r => r[bot].scores.hit1))),
    recall_at_3: r3(mean(scored.map(r => r[bot].scores.hit3))),
    all_gold_in_top3: r3(mean(scored.map(r => r[bot].scores.all3))),
    mrr_at_3: r3(mean(scored.map(r => r[bot].scores.rr))),
  };
  if (bot === 'b') {
    out.router_fallbacks = list.filter(r => r.b.router !== 'llm').length;
    out.invalid_ids_generated = list.reduce((a, r) => a + r.b.invalid_ids.length, 0);
  }
  if (withAnswers) {
    const refuseQs = list.filter(r => r.must_refuse);
    const answerQs = list.filter(r => !r.must_refuse);
    Object.assign(out, {
      correct_refusals: `${refuseQs.filter(r => r[bot].refused).length}/${refuseQs.length}`,
      false_refusals: `${answerQs.filter(r => r[bot].refused).length}/${answerQs.length}`,
      answers_citing_a_gold_section: r3(mean(answerQs.filter(r => !r[bot].refused).map(r => r[bot].cites_gold))),
      invalid_citations_removed: list.reduce((a, r) => a + r[bot].invalidCitations.length, 0),
      latency_p50_ms: pct(list.map(r => r[bot].latency_ms), 0.5),
      latency_p95_ms: pct(list.map(r => r[bot].latency_ms), 0.95),
      mean_tokens: Math.round(mean(list.map(r => r[bot].tokens))),
    });
  }
  return out;
}

const types = uniq(rows.map(r => r.type));
const summary = {
  split, source_version: idx.version, embed_model: idx.embed_model, run_at: new Date().toISOString(),
  overall: { bot_a_standard_rag: summarise(rows, 'a'), bot_b_structure_aware: summarise(rows, 'b') },
  by_type: Object.fromEntries(types.map(t => [t, {
    bot_a: summarise(rows.filter(r => r.type === t), 'a'),
    bot_b: summarise(rows.filter(r => r.type === t), 'b'),
  }])),
};
if (withAnswers) {
  const lat = rows.map(r => r.v1.latency_ms);
  summary.overall.v1_full_context = {
    correct_refusals_note: 'v1 has no "Not supported" contract, so refusals are judged by humans on the blind sheet',
    latency_p50_ms: pct(lat, 0.5), latency_p95_ms: pct(lat, 0.95),
  };
}

const suffix = withAnswers ? split : `${split}-retrieval`;
await writeFile(new URL(`eval/results-${suffix}.json`, root), JSON.stringify({ summary, rows }, null, 2));

if (withAnswers) {
  const key = {};
  const csv = [['id', 'question', 'answer_X', 'answer_Y', 'X_correct(0/1)', 'Y_correct(0/1)', 'X_supported(0/1)', 'Y_supported(0/1)', 'better(X/Y/same)']];
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  for (const r of rows) {
    const flip = Math.random() < 0.5;
    key[r.id] = flip ? { X: 'B', Y: 'A' } : { X: 'A', Y: 'B' };
    const [x, y] = flip ? [r.b.answer, r.a.answer] : [r.a.answer, r.b.answer];
    csv.push([r.id, esc(r.question), esc(x), esc(y), '', '', '', '', '']);
  }
  await writeFile(new URL(`eval/blind-${split}.csv`, root), csv.map(c => c.join(',')).join('\n'));
  await writeFile(new URL(`eval/blind-${split}-key.json`, root), JSON.stringify(key, null, 2));
}
console.log(JSON.stringify(summary.overall, null, 2));
