# Two-bot RAG comparison: method, results and limits

Run on 5 November 2026 · knowledge base `public_v1` (34 sections, 36 passages) · answer model `@cf/meta/llama-3.1-8b-instruct-fast` · embeddings `@cf/baai/bge-small-en-v1.5` · answer prompt `v2`.

## The short version

- **On the 60 development questions, the structure-aware bot (Bot B) found the right section first more often** (84% vs 72%). **On the 15 held-back questions that advantage disappeared** (both 64% first-hit; Bot A 100% vs Bot B 86% in the top 3). With this few questions, neither bot is clearly better at finding evidence.
- **Bot B costs more:** about 1.8× the tokens and about 0.4 s slower, because it makes an extra model call to choose sections.
- **Bot B refuses more often when it shouldn't** (9 of 47 vs 6 of 47 answerable development questions; 3 of 13 vs 0 of 13 held-back), mostly on questions that span two topics, where it picked only one of them.
- **Both bots refuse correctly when the knowledge base doesn't have the answer** (11–12 of 13 on development, 2 of 2 held-back), and neither invented a section ID or kept a fake citation.
- **A fine-tuned STAIR-style retriever (offline, Phase 5) matched Bot B but did not beat standard RAG on the held-out questions;** its "real IDs only" decoding removed every invented section ID.
- **This corpus is small** (one passage per section on average), so the two methods see nearly the same text units. That limits how different they *can* be. The result is a fair test of this portfolio, not a general verdict on STAIR.

## What was compared

| | Bot A · Standard RAG | Bot B · Structure-aware (STAIR-inspired) |
|---|---|---|
| Finds evidence by | BM25 keywords + embedding search over passages, merged with Reciprocal Rank Fusion | Model reads the table of contents and names up to 3 section IDs; IDs checked against the real list (embedding fallback if none valid) |
| Evidence given to the answerer | top 5 passages | passages of the chosen sections, max 5 |
| Answer model, prompt, settings, citation check | **same** | **same** |
| Model calls per question | 1 embedding + 1 answer | 1 embedding + 1 routing + 1 answer |

The independent variable is only the retrieval method. Same documents, same question set, same answer model, prompt (`v2`), temperature (0.3), output limit (400 tokens) and citation rules.

## Test set

`eval/gold.json`: 75 hand-labelled questions, written from the knowledge base **before** either bot was run. Each answerable question names the section(s) that contain its answer.

| Type | Dev | Held-out | What it tests |
|---|---|---|---|
| Simple fact | 12 | 5 | Direct lookup |
| Paraphrase | 12 | 3 | Different words from the source |
| Comparison | 10 | 2 | Across projects |
| Multi-hop | 8 | 2 | Needs two sections |
| Missing evidence | 8 | 2 | Must say "Not supported" |
| Version trap | 5 | 1 | Old vs new facts, wrong premises |
| Vague follow-up | 5 | 0 | "What about the other one?" with no earlier chat |

The 15 held-out questions were run **once**, after all settings were frozen. The 1 synthetic training question too close to a test question was removed from the Phase 5 data.

## Results

Retrieval scores use the first 3 distinct sections each bot returned (Bot B returns at most 3), on questions that have a gold section.

| Metric | Dev A | Dev B | Held-out A | Held-out B |
|---|---|---|---|---|
| Right section first (Recall@1) | 72% | **84%** | 64% | 64% |
| Right section in top 3 (Recall@3) | 92% | 94% | **100%** | 86% |
| All needed sections in top 3 | 82% | **90%** | **93%** | 79% |
| MRR (top 3) | 0.82 | **0.89** | **0.82** | 0.75 |
| Correct "Not supported" | 11/13 | 12/13 | 2/2 | 2/2 |
| Wrong "Not supported" (answerable) | **6/47** | 9/47 | **0/13** | 3/13 |
| Answers citing a correct section | 90% | 95% | 92% | 100% |
| Median / p95 latency | **0.78 / 1.19 s** | 1.21 / 1.65 s | **0.86 / 1.60 s** | 1.26 / 1.87 s |
| Tokens per question | **899** | 1,613 | **940** | 1,610 |
| Invented section IDs / fake citations kept | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Scored questions: 50 dev, 14 held-out. With 14 questions, one question moves a percentage by 7 points.

**By question type (dev, first-hit / top-3):** simple A 92/100 vs B 100/100 · paraphrase 67/83 vs 92/100 · comparison 40/80 vs 60/70 · multi-hop 63/100 vs 75/100. Bot B helps most on paraphrases; it is weakest on comparisons, where it often chooses one topic and misses the other.

**v1 full-context bot (control):** median 0.66 s on dev. It has no "Not supported" rule, so its refusals and correctness need the human review below.

## What changed during development (and why)

The first dev run (answer prompt `v1`) showed two failures shared by both bots:

1. **Vague follow-ups** ("What about the other one?") got invented answers. Correct refusals were 9/13 (A) and 8/13 (B).
2. **Wrong-premise questions** ("Did the dental app use TensorFlow?") got "Not supported" instead of "No, it uses PyTorch Mobile".

Prompt `v2` added two rules to the **shared** answerer, so the change applies to both bots equally. Result on the same dev questions:

| | Prompt v1 A | v1 B | Prompt v2 A | v2 B |
|---|---|---|---|---|
| Correct refusals | 9/13 | 8/13 | 11/13 | 12/13 |
| Wrong refusals | 3/47 | 6/47 | 6/47 | 9/47 |

`v2` was kept because on a recruiter-facing site an unnecessary refusal is safer than an invented answer. The remaining wrong refusals are mostly the small model writing the right correction but still starting with "Not supported" (for example "Not supported: … they do mention a validation figure of 95%"). A larger answer model is the likely fix; it was not tried because it costs more per question.

## Phase 5: a fine-tuned STAIR-style retriever (offline)

This is closer to the paper's method than Bot B: instead of prompting a general model, a small model is **trained** to output a section ID, and its output is **restricted to real IDs** while it is generated.

**How it was built** (`research/stair/`)

1. **Training questions:** the Workers AI chat model wrote 12 questions per section (407 total). One was too similar to a test question and was removed; 406 kept (354 train / 52 check). Each question is labelled with the section it was written from. The labelled test questions were never used for training.
2. **Fine-tuning:** Qwen2.5-1.5B-Instruct with LoRA (rank 16, alpha 32, the paper's settings), input = table of contents + question, target = the section ID. 3 epochs, 46 minutes on an RTX 5070 (12 GB). Loss on the 52 held-aside training questions fell 0.29 → 0.22 → 0.20.
3. **Restricted output:** a prefix tree of the real section IDs; at each step the model may only produce a token that continues a real ID. Beam search returns the top 3.

The paper used Mistral-7B, which needs a licence acceptance and is tight on 12 GB, so this is a **smaller base model than the paper**, trained on 34 sections rather than 18 books.

**Results on the same labelled questions as the two bots** (dev 50 / held-out 14 scored questions; free generation returns one answer, so its top-3 equals its first-hit):

| Retriever | Dev first-hit | Dev top-3 | Held-out first-hit | Held-out top-3 | Questions with an invented ID (dev + held-out) |
|---|---|---|---|---|---|
| Untrained Qwen, free output | 48% | 48% | 36% | 36% | **15 of 64** |
| Untrained Qwen, restricted to real IDs | 66% | 76% | 50% | 86% | 0 |
| Fine-tuned Qwen, free output | **86%** | 86% | **71%** | 71% | 0 |
| Fine-tuned Qwen, restricted (STAIR-style) | 84% | **96%** | 64% | 86% | 0 |
| *Bot A (standard RAG, live)* | 72% | 92% | 64% | **100%** | — |
| *Bot B (prompted router, live)* | 84% | 94% | 64% | 86% | 0 |

**What this shows**

- **Restricting the output to real IDs works as the paper describes:** the untrained model invented sections on 15 questions (for example it answered "TCP Chat App connects on port 9000", a fact that is not in the knowledge base); with the restriction, none.
- **Fine-tuning helped a lot over the untrained model** (first-hit 48% → 84–86% on dev) and, after training, the model stopped inventing IDs even without the restriction.
- **The fine-tuned 1.5B model matches the live prompted router (Bot B)** while being far smaller and running locally in about 0.6 s per question with no API cost. It does **not** beat standard RAG on the held-out questions.
- The paper's "0.05% hallucination" figure is about invalid IDs, and this experiment confirms that meaning: the restriction removes invented IDs but cannot make a wrong-but-valid section right.

**Not deployed:** Cloudflare Pages cannot run this model. It stays an offline experiment.

## Not measured yet

- **Answer correctness and faithfulness by people.** `eval/blind-dev.csv` and `eval/blind-heldout.csv` show the two bots' answers as X/Y in random order; the keys (`eval/blind-*-key.json`) are kept off GitHub so reviewers stay blind. Two reviewers should fill them in without looking at the key.
- **Live traffic.** No visitor numbers or feedback exist yet.
- **Multi-turn memory.** The site is single-turn by design; vague follow-ups are answered with "which one do you mean?".

## Files

`lib/rag.mjs` (all logic, shared by the site and the evaluation) · `content/kb.md` · `eval/gold.json` · `eval/results-*.json` · `scripts/eval.mjs` · `research/stair/`.
