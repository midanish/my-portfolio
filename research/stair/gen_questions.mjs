// Phase 5, step 1: build a synthetic query -> leaf training set, like STAIR's
// stage A (the paper used Mixtral 8x7B; here the site's Workers AI chat model).
// Every generated question inherits the leaf it was written from.
// Leakage control: drop any generated question too similar to a labelled
// evaluation question (eval/gold.json), so the final test stays untouched.
//
//   node research/stair/gen_questions.mjs   (needs `npx wrangler login`)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseKb, embed, chat, dot, tokenize } from '../../lib/rag.mjs';
import { cloudflareEnv } from '../../scripts/cloudflare-env.mjs';

const env = cloudflareEnv();
const root = new URL('../../', import.meta.url);
const { version, sections } = parseKb(await readFile(new URL('content/kb.md', root), 'utf8'));
const leaves = sections.filter(s => s.isLeaf);
const gold = JSON.parse(await readFile(new URL('eval/gold.json', root), 'utf8')).questions;

const PER_LEAF = 12;
const out = [];
for (const leaf of leaves) {
  const messages = [
    {
      role: 'system',
      content: `Write ${PER_LEAF} different questions that a recruiter or visitor might ask about Iqmal Danish, each answered by the SECTION below.
Vary the style: some short, some long, some casual, some using different words from the section. Do not copy whole phrases from the section.
Reply with JSON only: {"questions": ["...", "..."]}`,
    },
    { role: 'user', content: `SECTION PATH: ${leaf.path.join(' > ')}\nSECTION TEXT: ${leaf.text}` },
  ];
  let qs = [];
  for (let attempt = 1; attempt <= 3 && !qs.length; attempt++) {
    try {
      const r = await chat(messages, env, { maxTokens: 900, temperature: 0.9 });
      const m = r.content.match(/\{[\s\S]*\}/);
      qs = m ? (JSON.parse(m[0]).questions || []).filter(q => typeof q === 'string' && q.length > 8) : [];
    } catch (e) {
      console.error(`${leaf.id} attempt ${attempt}: ${e.message}`);
    }
  }
  qs.forEach(q => out.push({ question: q.trim(), leaf_id: leaf.id }));
  console.log(`${leaf.id}: ${qs.length}`);
}

// --- Leakage filter against the labelled evaluation questions ---
const jaccard = (a, b) => {
  const A = new Set(tokenize(a)); const B = new Set(tokenize(b));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, new Set([...A, ...B]).size);
};
const goldVecs = await embed(gold.map(g => g.question), env, { query: true });
const kept = [];
let dropped = 0;
for (let i = 0; i < out.length; i += 32) {
  const batch = out.slice(i, i + 32);
  const vecs = await embed(batch.map(b => b.question), env, { query: true });
  batch.forEach((b, j) => {
    const maxCos = Math.max(...goldVecs.map(g => dot(g, vecs[j])));
    const maxJac = Math.max(...gold.map(g => jaccard(g.question, b.question)));
    if (maxCos > 0.92 || maxJac > 0.6) { dropped++; return; }
    kept.push(b);
  });
}

// Deduplicate and split 90/10 into train / dev (dev is for training checks only).
const seen = new Set();
const uniqueRows = kept.filter(r => { const k = r.question.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
let seed = 42;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
uniqueRows.forEach(r => { r.split = rand() < 0.1 ? 'dev' : 'train'; });

await mkdir(new URL('research/stair/data/', root), { recursive: true });
await writeFile(new URL('research/stair/data/synthetic.jsonl', root), uniqueRows.map(r => JSON.stringify(r)).join('\n') + '\n');
await writeFile(new URL('research/stair/data/toc.json', root), JSON.stringify({
  version, leaves: leaves.map(l => ({ id: l.id, path: l.path })),
}, null, 2));
console.log(`Generated ${out.length}, dropped ${dropped} too close to evaluation questions, kept ${uniqueRows.length} ` +
  `(${uniqueRows.filter(r => r.split === 'train').length} train / ${uniqueRows.filter(r => r.split === 'dev').length} dev).`);
