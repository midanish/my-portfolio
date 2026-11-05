# Iqmal Danish — Portfolio, AI Assistant and Two-Bot RAG Comparison

A macOS-styled portfolio site with two AI features:

1. **Portfolio assistant (v1, `/api/chat`)** — answers questions about Iqmal by giving the model the *whole* profile every time. There is no retrieval step; the profile is small enough to fit.
2. **Two-bot comparison (v2, `/api/compare`)** — the chat window now shows two answers to every question, labelled Answer A and Answer B, from the same knowledge base (`/compare` shows the same thing with the evidence each bot used):
   - **Bot A · Standard RAG:** BM25 keyword search + embedding search over short passages, merged with Reciprocal Rank Fusion, top 5 passages.
   - **Bot B · Structure-aware RAG (STAIR-inspired):** a model chooses up to 3 sections from the knowledge base's table of contents (titles plus the opening words of each section); the IDs are checked against the real list (embedding fallback if none are valid); those sections are read, and spare evidence slots are filled with neighbouring sections (max 5 passages).
   - Both use the same answer model (Llama 3.1 8B on Cloudflare Workers AI), prompt, evidence budget and citation check. **Only retrieval differs.**

Results, method and limits: [`docs/two-bot-methodology.md`](docs/two-bot-methodology.md). What v1 really did before this work: [`docs/baseline.md`](docs/baseline.md).

## Project layout

| Path | What it is |
|---|---|
| `public/` | Static site (served as-is by Cloudflare Pages) |
| `functions/api/chat.js` | v1 assistant (unchanged; kept as the baseline) |
| `functions/api/compare.js` | v2 endpoint: input limits, per-visitor rate limit, runs both bots |
| `lib/rag.mjs` | All retrieval, routing, answer and citation logic — shared by the site and the evaluation |
| `content/kb.md` | Knowledge base (public sources only, each section names its source) |
| `public/data/kb/index.json` | Built index: sections, passages, embeddings (`npm run build:index`) |
| `eval/gold.json` | Hand-labelled questions with the section that should answer each |
| `scripts/eval.mjs` | Scores retrieval and answers for both bots + v1 control |
| `research/stair/` | Phase 5: LoRA fine-tuned section retriever with constrained decoding (offline; results in `research/stair/results.json`) |
| `server.js` | Older local Express server (v1 only; not used by the live site) |

## Setup

```bash
npm install
npx wrangler login        # scripts and local dev use Workers AI through this login
```

| Command | What it does |
|---|---|
| `npm test` | Offline tests (no token needed) |
| `npm run build:index` | Rebuild `public/data/kb/index.json` after editing `content/kb.md` |
| `npm run eval -- --split dev` | Run the labelled questions (use `--split heldout` only for final results) |
| `npm run dev:cloudflare` | Run the site + functions locally with Wrangler (reads `.dev.vars` for the token) |
| `npm run smoke [-- <url>]` | Ask a few known questions against a running site |

When you change the knowledge base, bump `version` in `content/kb.md` and `source_version` in `eval/gold.json`, rebuild the index and re-run the evaluation.

## Deployment (Cloudflare Pages — Git auto-build)

Pushing to `main` triggers an automatic Cloudflare build and deploy.

- Production branch: `main` · Build command: none · Output directory: `public` · Functions: auto-detected from `/functions`
- Models run on Cloudflare Workers AI: add a **Workers AI binding named `AI`** in Cloudflare → Workers & Pages → my-portfolio → Settings → Bindings. `/api/chat` falls back to Hugging Face (`HF_TOKEN`) if the binding is missing. Optional: `CHAT_MODEL`.

## Limits worth knowing

- The rate limit (8 questions per minute per visitor) is kept in memory per Cloudflare instance, so it is best-effort, not a hard quota.
- `/api/compare` makes about four model calls per question (one embedding, one routing, two answers).
- Bot B is a prompted router with an ID check, not the paper's fine-tuned STAIR retriever. The fine-tuned version is tested offline only (`research/stair/`).

## License

MIT
