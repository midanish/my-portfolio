"""Phase 5, step 3: evaluate the STAIR-style retriever on the labelled questions.

Four conditions, all on the same questions and the same top-3 scoring as
scripts/eval.mjs:
  base model,       free generation        -> how often it invents IDs
  base model,       constrained to real IDs
  fine-tuned model, free generation
  fine-tuned model, constrained to real IDs (beam search, top 3) = STAIR-style

Constrained decoding: a prefix tree of the tokenised leaf IDs; at each step only
tokens that continue a real ID are allowed (STAIR stage C).

    research/stair/.venv/Scripts/python research/stair/infer_eval.py
"""
import json
import time

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

from common import BASE_MODEL, HERE, ROOT, load_toc, prompt_ids, target_ids, toc_text

device = "cuda"
toc = load_toc()
toc_str = toc_text(toc)
leaf_ids = [l["id"] for l in toc["leaves"]]
gold = json.loads((ROOT / "eval" / "gold.json").read_text(encoding="utf-8"))
assert gold["source_version"] == toc["version"], "gold set and ToC versions differ"
questions = [q for q in gold["questions"] if q["gold"]]  # same rule as eval.mjs: score only questions with a gold section

tok = AutoTokenizer.from_pretrained(BASE_MODEL)
END = tok.convert_tokens_to_ids("<|im_end|>")

# Prefix tree: tuple(prefix tokens) -> set of allowed next tokens.
trie = {}
id_by_tokens = {}
for lid in leaf_ids:
    seq = target_ids(tok, lid)
    id_by_tokens[tuple(seq[:-1])] = lid
    for i in range(len(seq)):
        trie.setdefault(tuple(seq[:i]), set()).add(seq[i])
MAX_NEW = max(len(target_ids(tok, l)) for l in leaf_ids) + 1


def generate(model, question, constrained):
    p = prompt_ids(tok, toc_str, question)
    ids = torch.tensor([p], device=device)
    plen = len(p)

    def allowed(_batch, seq):
        gen = tuple(seq[plen:].tolist())
        if gen and gen[-1] == END:
            return [END]
        return list(trie.get(gen, {END}))

    with torch.no_grad():
        if constrained:
            out = model.generate(ids, attention_mask=torch.ones_like(ids), max_new_tokens=MAX_NEW, num_beams=3,
                                 num_return_sequences=3, prefix_allowed_tokens_fn=allowed, do_sample=False,
                                 eos_token_id=END, pad_token_id=tok.pad_token_id)
        else:
            out = model.generate(ids, attention_mask=torch.ones_like(ids), max_new_tokens=MAX_NEW + 8,
                                 do_sample=False, eos_token_id=END, pad_token_id=tok.pad_token_id)
    texts = []
    for row in out:
        gen = row[plen:].tolist()
        gen = gen[: gen.index(END)] if END in gen else gen
        texts.append(tok.decode(gen, skip_special_tokens=True).strip())
    ranked = []
    for t in texts:
        if t not in ranked:
            ranked.append(t)
    return ranked


def score(ranked, gold_ids):
    top = [r for r in ranked if r in leaf_ids][:3]
    first = next((i for i, r in enumerate(top) if r in gold_ids), -1)
    return {"hit1": int(bool(top) and top[0] in gold_ids), "hit3": int(first >= 0),
            "all3": int(all(g in top for g in gold_ids)), "rr": 1 / (first + 1) if first >= 0 else 0.0}


def run(model, name, constrained):
    rows, t0 = [], time.time()
    for q in questions:
        ranked = generate(model, q["question"], constrained)
        rows.append({"id": q["id"], "split": q["split"], "type": q["type"], "gold": q["gold"], "ranked": ranked,
                     "invalid": [r for r in ranked if r not in leaf_ids], **score(ranked, q["gold"])})
    summary = {}
    for split in ("dev", "heldout"):
        rs = [r for r in rows if r["split"] == split]
        mean = lambda k: round(sum(r[k] for r in rs) / len(rs), 3)
        summary[split] = {"n": len(rs), "recall_at_1": mean("hit1"), "recall_at_3": mean("hit3"),
                          "all_gold_in_top3": mean("all3"), "mrr_at_3": mean("rr"),
                          "questions_with_invalid_id": sum(1 for r in rs if r["invalid"])}
    summary["seconds_per_question"] = round((time.time() - t0) / len(rows), 2)
    print(name, json.dumps(summary), flush=True)
    return {"summary": summary, "rows": rows}


base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=torch.bfloat16).to(device).eval()
results = {"base_model": BASE_MODEL, "toc_version": toc["version"], "n_leaves": len(leaf_ids)}
results["base_free"] = run(base, "base_free", constrained=False)
results["base_constrained"] = run(base, "base_constrained", constrained=True)

tuned = PeftModel.from_pretrained(base, HERE / "out" / "adapter").eval()
results["tuned_free"] = run(tuned, "tuned_free", constrained=False)
results["tuned_constrained"] = run(tuned, "tuned_constrained", constrained=True)

(HERE / "out").mkdir(exist_ok=True)
(HERE / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print("wrote", HERE / "results.json")
