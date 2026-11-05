// Offline tests for lib/rag.mjs (no network, no token needed).
// Run: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  parseKb, chunkLeaves, tokenize, buildBm25, bm25Scores, topK, rrf,
  parseLeafIds, validateIds, verifyCitations, isRefusal, passagesForLeaves, prepareIndex, EVIDENCE_BUDGET,
} from '../lib/rag.mjs';

const md = await readFile(new URL('../content/kb.md', import.meta.url), 'utf8');
const kb = parseKb(md);
const leaves = kb.sections.filter(s => s.isLeaf);
const passages = chunkLeaves(kb.sections);

test('knowledge base parses with unique IDs, sources and text on every leaf', () => {
  assert.equal(kb.version, 'public_v3');
  assert.ok(leaves.length >= 30, `only ${leaves.length} leaves`);
  for (const l of leaves) {
    assert.ok(l.text.length > 40, `${l.id} text too short`);
    assert.ok(l.source, `${l.id} has no source`);
    assert.ok(l.id.startsWith(l.parent ?? ''), `${l.id} not under ${l.parent}`);
  }
  assert.deepEqual(kb.sections.find(s => s.id === 'projects.food.dataset').path,
    ['Projects', 'Food image classification (Dec 2025)', 'Dataset']);
});

test('every gold label in eval/gold.json points at a real leaf section', async () => {
  const gold = JSON.parse(await readFile(new URL('../eval/gold.json', import.meta.url), 'utf8'));
  const ids = new Set(leaves.map(l => l.id));
  const qids = new Set();
  for (const q of gold.questions) {
    assert.ok(!qids.has(q.id), `duplicate question id ${q.id}`);
    qids.add(q.id);
    for (const g of q.gold) assert.ok(ids.has(g), `${q.id}: unknown section ${g}`);
    if (!q.must_refuse) assert.ok(q.gold.length > 0, `${q.id}: answerable question needs a gold section`);
  }
  assert.ok(gold.questions.filter(q => q.split === 'heldout').length >= 10);
});

test('passages cover every leaf, keep text intact and stay near the size limit', () => {
  for (const l of leaves) {
    const ps = passages.filter(p => p.section_id === l.id);
    assert.ok(ps.length >= 1, `${l.id} has no passage`);
    assert.equal(ps.map(p => p.text).join(' ').replace(/\s+/g, ' '), l.text.replace(/\s+/g, ' '));
  }
  for (const p of passages) assert.ok(p.text.split(/\s+/).length <= 130, `${p.pid} too long`);
});

test('BM25 ranks the passage containing a rare exact term first', () => {
  const docs = passages.map(p => p.text);
  const idx = buildBm25(docs);
  const best = topK(bm25Scores(idx, 'Which camera library does the dental app use? AndroidUSBCamera'), 1)[0];
  assert.equal(passages[best].section_id, 'projects.dental.mobile');
  const best2 = topK(bm25Scores(idx, 'BagelSandwich images'), 1)[0];
  assert.equal(passages[best2].section_id, 'projects.food.dataset');
});

test('tokenizer keeps version numbers and drops stop words', () => {
  assert.deepEqual(tokenize('The YOLOv8 model at 0.906 mAP'), ['yolov8', 'model', '0.906', 'map']);
});

test('RRF favours a document strong in both lists (masterclass mini example)', () => {
  const embedding = ['A', 'x1', 'B', ...Array.from({ length: 17 }, (_, i) => `e${i}`)];
  const bm25 = ['B', ...Array.from({ length: 18 }, (_, i) => `k${i}`), 'A'];
  assert.equal(rrf([embedding, bm25])[0], 'B');
});

test('router output parsing and ID validation reject invented sections', () => {
  const allowed = new Set(leaves.map(l => l.id));
  assert.deepEqual(parseLeafIds('{"leaf_ids": ["projects.food.model", "projects.iqmetric.security"]}'),
    ['projects.food.model', 'projects.iqmetric.security']);
  const v = validateIds(['projects.food.model', 'projects.iqmetric.security', 'projects.food.model'], allowed);
  assert.deepEqual(v.valid, ['projects.food.model']);
  assert.deepEqual(v.invalid, ['projects.iqmetric.security']);
  assert.deepEqual(parseLeafIds('Sure! projects.food.results and education.degree'), ['projects.food.results', 'education.degree']);
});

test('citation check removes citations that were not in the evidence', () => {
  const allowed = new Set(['projects.food.dataset']);
  const r = verifyCitations('It has 497 images [projects.food.dataset]. It won an award [projects.dental.overview].', allowed);
  assert.deepEqual(r.citations, ['projects.food.dataset']);
  assert.deepEqual(r.invalidCitations, ['projects.dental.overview']);
  assert.ok(!r.answer.includes('dental'));
  assert.ok(isRefusal('Not supported: the sources do not mention team size.'));
  assert.ok(!isRefusal('It is not supported by hardware.'.replace(/^It/, 'Yes, it')));
});

test('Bot B never passes more evidence than Bot A (same budget)', () => {
  const fakeIndex = prepareIndex({
    version: 't',
    leaves: leaves.map(l => ({ id: l.id, path: l.path })),
    passages: passages.map(p => ({ ...p, vec: [1, 0] })),
  });
  const many = leaves.slice(0, 3).map(l => l.id);
  const got = passagesForLeaves(fakeIndex, many, 'question', [1, 0]);
  assert.ok(got.length <= EVIDENCE_BUDGET);
  // Chosen sections come first; any extra passage is from a sibling (same parent) section.
  const parent = id => id.split('.').slice(0, -1).join('.');
  const parents = new Set(many.map(parent));
  const firstExtra = got.findIndex(p => !many.includes(p.section_id));
  if (firstExtra !== -1) {
    assert.ok(got.slice(firstExtra).every(p => !many.includes(p.section_id)));
    assert.ok(got.slice(firstExtra).every(p => parents.has(parent(p.section_id))));
  }
});
