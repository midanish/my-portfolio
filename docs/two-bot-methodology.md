# Two-bot RAG comparison: method, results and limits

Run on 5 November 2026 · knowledge base `public_v2` (34 sections, 38 passages) · answer model `@cf/meta/llama-3.1-8b-instruct-fast` · embeddings `@cf/baai/bge-small-en-v1.5` · answer prompt `v2`.

## The short version

- **After one round of improvements, the structure-aware bot (Bot B) finds evidence better than standard RAG (Bot A), on both question sets.** All needed sections in the top 3: 96% vs 82% on the 60 development questions, and 100% vs 93% on the 15 held-back questions. Right section first: 82% vs 74% (dev) and 71% vs 64% (held-back).
- **Bot B also refuses answerable questions less often** (6 vs 8 of 47 on dev, 1 vs 2 of 13 held-back).
- **Bot B is worse at one thing: vague follow-ups** like "And how accurate was it?" with no earlier conversation. It answered 3 of these 5 about whichever project it guessed, where Bot A refused all 5 (correct refusals 10/13 vs 13/13 on dev).
- **Bot B costs more:** about 3x the tokens (2,736 vs 899 per question) and about 0.45 s slower, because it makes an extra model call that reads the whole table of contents.
- **Neither bot invented a section ID or kept a fake citation** in the final runs.
- **Answer-level counts move by one or two questions between identical runs**, because the answer model samples its wording (temperature 0.3). Retrieval scores are stable; treat small differences in refusal counts as noise.
- **This corpus is small** (about one passage per section), and with 14 scored held-back questions one question moves a percentage by 7 points. The result is a fair test of this portfolio, not a general verdict on STAIR.

## What was compared

| | Bot A · Standard RAG | Bot B · Structure-aware (STAIR-inspired) |
|---|---|---|
| Finds evidence by | BM25 keywords + embedding search over passages, merged with Reciprocal Rank Fusion | Model reads the table of contents (each section's ID, path and opening words) and names up to 3 section IDs; IDs checked against the real list (embedding fallback if none valid) |
| Evidence given to the answerer | top 5 passages | passages of the chosen sections, then sibling sections (same parent in the table of contents) in any spare slots; max 5 |
| Answer model, prompt, settings, citation check | **same** | **same** |
| Model calls per question | 1 embedding + 1 answer | 1 embedding + 1 routing + 1 answer |

The independent variable is only the retrieval method. Both bots have the same 5-passage evidence budget. Same documents, same question set, same answer model, prompt (`v2`), temperature (0.3), output limit (400 tokens) and citation rules.

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

The 15 held-out questions were first run **once**, after all settings were frozen. They were then re-run after the knowledge-base update and after the Bot B improvements described below. Every Bot B change was chosen by looking only at development questions; held-out results were never used to pick a setting. The held-out questions have nonetheless now been run several times, so they are less "unseen" than a fresh test set would be. The 1 synthetic training question too close to a test question was removed from the Phase 5 data.

**Knowledge-base update (`public_v1` → `public_v2`).** The two sections about the chatbot itself were corrected: Version 1 is described in the past tense (it used GLM-4.7-Flash; its code now calls Llama 3.1 8B), and Version 2 is described as what the site's chat window runs, showing Answer A (RAG) and Answer B (STAIR-style) in one reply. One sentence was added saying what RAG stands for, because the answer model kept inventing expansions of the acronym. No other section changed and no test question or label changed. All numbers below are from the re-run on `public_v2`; the earlier `public_v1` run differed by at most one or two questions per metric.

## Results

Retrieval scores use the first 3 distinct sections each bot handed to the answer model (for Bot B: the router's picks first, then sibling sections), on questions that have a gold section.

| Metric | Dev A | Dev B | Held-out A | Held-out B |
|---|---|---|---|---|
| Right section first (Recall@1) | 74% | **82%** | 64% | **71%** |
| Right section in top 3 (Recall@3) | 90% | **98%** | 100% | 100% |
| All needed sections in top 3 | 82% | **96%** | 93% | **100%** |
| MRR (top 3) | 0.82 | **0.90** | 0.81 | **0.85** |
| Correct "Not supported" | **13/13** | 10/13 | 2/2 | 2/2 |
| Wrong "Not supported" (answerable) | 8/47 | **6/47** | 2/13 | **1/13** |
| Answers citing a correct section | 90% | 90% | 73% | **100%** |
| Median / p95 latency | **0.75 / 1.07 s** | 1.21 / 1.61 s | **0.72 / 1.05 s** | 1.20 / 1.53 s |
| Tokens per question | **899** | 2,736 | **933** | 2,706 |
| Invalid section IDs named by the router (caught) | — | 0 | — | 0 |
| Fake citations removed / kept | 1 / 0 | 2 / 0 | 0 / 0 | 0 / 0 |

Scored questions: 50 dev, 14 held-out. With 14 questions, one question moves a percentage by 7 points.

**By question type (dev, first-hit / top-3):** simple A 100/100 vs B 92/100 · paraphrase 67/83 vs 92/100 · comparison 40/70 vs 60/90 · multi-hop 63/100 vs 88/100. Bot B's biggest gains are on paraphrases, comparisons and multi-hop questions. Wrong refusals by type, A vs B: paraphrase 2 vs 2, comparison 2 vs 1, version trap 4 vs 3. Correct refusals on vague follow-ups: A 5/5, B 2/5.

**v1 full-context bot (control):** median 0.70 s on dev. It has no "Not supported" rule, so its refusals and correctness need the human review below.

## What changed during development (and why)

The first dev run (answer prompt `v1`) showed two failures shared by both bots:

1. **Vague follow-ups** ("What about the other one?") got invented answers. Correct refusals were 9/13 (A) and 8/13 (B).
2. **Wrong-premise questions** ("Did the dental app use TensorFlow?") got "Not supported" instead of "No, it uses PyTorch Mobile".

Prompt `v2` added two rules to the **shared** answerer, so the change applies to both bots equally. Result on the same dev questions (both columns on knowledge base `public_v1`):

| | Prompt v1 A | v1 B | Prompt v2 A | v2 B |
|---|---|---|---|---|
| Correct refusals | 9/13 | 8/13 | 11/13 | 12/13 |
| Wrong refusals | 3/47 | 6/47 | 6/47 | 9/47 |

`v2` was kept because on a recruiter-facing site an unnecessary refusal is safer than an invented answer. The remaining wrong refusals are mostly the small model writing the right correction but still starting with "Not supported" (for example "Not supported: … they do mention a validation figure of 95%"). A larger answer model is the likely fix; it was not tried because it costs more per question.

## Improving Bot B (round 2)

The first version of Bot B found the right sections only slightly more often than Bot A on dev and lost on the held-out questions. Its dev misses had two causes:

1. **The router only saw section titles.** For example, for "Which of his NXP projects use Microsoft Power Platform and which use C#?" it picked the OCR and vent-hole sections, because nothing in their titles said what technology they used.
2. **It usually used only 2 of its 5 evidence slots,** so a near miss (the right project but the neighbouring section, such as the dental app's "overview" instead of "mobile app") meant the answer was missing.

Each change below was measured on dev only:

| Change | Dev: all needed sections in top 3 | Kept? |
|---|---|---|
| Before | 88% | — |
| Add the opening 18 words of each section to the table of contents | 88% (one question better on first-hit) | yes, with the next change |
| Fill spare evidence slots with sibling sections, closest to the question first | 92% | yes |
| Both together | **96%** (same on a repeat run) | **yes** |
| Also let the router answer "no section" for vague follow-ups | 90%, and it still guessed on 3 of 5 vague questions | no, removed |

The cost of the kept changes is the longer table of contents the router reads: about 960 more tokens per question.

**Side effect:** with more evidence from one project, the answer model sometimes treats a vague follow-up ("Which tools did he use for that?") as being about that project instead of asking which one is meant. This is the remaining weakness of Bot B.

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
| *Bot A (standard RAG, live)* | 74% | 90% | 64% | **100%** | — |
| *Bot B (prompted router, live, round 2)* | 82% | **98%** | **71%** | **100%** | 0 |

The fine-tuned rows were measured on `public_v1`. The `public_v2` update changed no section names or IDs, which is all this retriever sees, so it was not retrained. The fine-tuned rows are the model's own section picks; the Bot B row also counts the sibling sections it adds, so the two are not a like-for-like comparison of routers.

**What this shows**

- **Restricting the output to real IDs works as the paper describes:** the untrained model invented sections on 15 questions (for example it answered "TCP Chat App connects on port 9000", a fact that is not in the knowledge base); with the restriction, none.
- **Fine-tuning helped a lot over the untrained model** (first-hit 48% → 84–86% on dev) and, after training, the model stopped inventing IDs even without the restriction.
- **The fine-tuned 1.5B model matched the first version of the live router** while being far smaller and running locally in about 0.6 s per question with no API cost. It does **not** beat standard RAG on the held-out questions; the round-2 Bot B does.
- The paper's "0.05% hallucination" figure is about invalid IDs, and this experiment confirms that meaning: the restriction removes invented IDs but cannot make a wrong-but-valid section right.

**Not deployed:** Cloudflare Pages cannot run this model. It stays an offline experiment.

## Not measured yet

- **Answer correctness and faithfulness by people.** `eval/blind-dev.csv` and `eval/blind-heldout.csv` show the two bots' answers as X/Y in random order; the keys (`eval/blind-*-key.json`) are kept off GitHub so reviewers stay blind. Two reviewers should fill them in without looking at the key.
- **Live traffic.** No visitor numbers or feedback exist yet.
- **Multi-turn memory.** The site is single-turn by design; vague follow-ups are answered with "which one do you mean?".

## Files

`lib/rag.mjs` (all logic, shared by the site and the evaluation) · `content/kb.md` · `eval/gold.json` · `eval/results-*.json` · `scripts/eval.mjs` · `research/stair/`.
