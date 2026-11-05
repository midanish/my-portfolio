# Baseline: what the chatbot did before the two-bot upgrade

Snapshot preserved as git tag `v1-full-context-bot` (commit 73731d9). Audited 5 November 2026.

## In plain words

The live chatbot did **not** search anything. For every question it handed the model the *whole* profile and asked it to answer only from that. That works because the profile is short, but it is "grounded generation", not RAG. The local Express server (`server.js`) behaves differently from the live site, and the README described a TF-IDF / Transformers.js retrieval system that the live path never used.

## Live path (Cloudflare Pages, `functions/api/chat.js`)

1. Browser posts `{ message }` to `/api/chat`.
2. The function fetches `/data/portfolio.json` and turns all of it into one text block.
3. That block goes into the system prompt with grounding rules ("answer only from PROFILE DATA").
4. GLM-4.7-Flash is called through the Hugging Face router (`max_tokens 600`, `temperature 0.6`, `top_p 0.9`, thinking disabled).
5. If there is no token or the call fails, a keyword `if/else` fallback answers instead.
6. The response always carries `sessionId: 'cloudflare-session'`: no memory between turns, even though the browser stores its own session ID.

## Local path (`server.js`, `npm start`)

- Keeps conversation history in memory (per session ID).
- Its fallback splits the profile into about 22 chunks and ranks them with keyword rarity (IDF) weighting.
- So local and live are **not feature-identical**; results from one do not describe the other.

## Claims corrected in this upgrade

| Before | Reality | Change |
|---|---|---|
| README: "RAG with Transformers.js", "TF-IDF vector store" | Live path has no retrieval; Transformers.js was installed but never imported | README rewritten; `@xenova/transformers` removed from dependencies |
| Project card: "Implemented a RAG system" | v1 is full-context grounding | Card now describes v1 and v2 separately |
| "Session management" | Live API is stateless | Stated as stateless |

## Comparison rule chosen for v2

Same question, same knowledge-base version, same answer model and prompt, same evidence budget (5 passages) and same citation check for both bots. Only retrieval differs. The v1 bot stays live at `/api/chat` and is run as an extra control in the evaluation.
