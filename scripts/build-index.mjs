// Builds public/data/kb/index.json from content/kb.md.
// Run: node scripts/build-index.mjs   (needs `npx wrangler login` for Workers AI)
// Re-run whenever content/kb.md changes (and whenever EMBED_MODEL changes:
// vectors from different embedding models are not comparable).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseKb, chunkLeaves, passageSearchText, embed, EMBED_MODEL } from '../lib/rag.mjs';
import { cloudflareEnv } from './cloudflare-env.mjs';

const env = cloudflareEnv();
const md = await readFile(new URL('../content/kb.md', import.meta.url), 'utf8');
const { version, sections } = parseKb(md);
const leaves = sections.filter(s => s.isLeaf);
const passages = chunkLeaves(sections);

const vecs = [];
for (let i = 0; i < passages.length; i += 16) {
  const batch = passages.slice(i, i + 16).map(passageSearchText);
  vecs.push(...(await embed(batch, env)));
}
passages.forEach((p, i) => { p.vec = vecs[i].map(x => Math.round(x * 1e5) / 1e5); });

const index = {
  version,
  embed_model: EMBED_MODEL,
  built_at: new Date().toISOString(),
  toc: sections.map(s => ({ id: s.id, title: s.title, level: s.level, parent: s.parent, is_leaf: s.isLeaf })),
  leaves: leaves.map(s => ({ id: s.id, title: s.title, path: s.path, source: s.source, text: s.text })),
  passages,
};

await mkdir(new URL('../public/data/kb/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/kb/index.json', import.meta.url), JSON.stringify(index));
console.log(`Built ${version}: ${sections.length} sections, ${leaves.length} leaves, ${passages.length} passages, ${vecs[0].length}-dim vectors (${EMBED_MODEL}).`);
