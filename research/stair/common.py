"""Shared prompt format for the STAIR-style retriever (Phase 5).

Input  = instruction + table of contents (leaf IDs and paths) + question.
Target = the exact leaf ID, followed by the end-of-turn token.
The same format is used for training and for inference.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

SYSTEM = (
    "You choose the section of a knowledge base about Iqmal Danish that answers a visitor's question. "
    "Reply with exactly one section ID from the table of contents and nothing else."
)


def load_toc():
    return json.loads((HERE / "data" / "toc.json").read_text(encoding="utf-8"))


def toc_text(toc):
    # Same layout as tocText() in lib/rag.mjs, so Bot B and the fine-tuned model see the same map.
    return "\n".join(f"{l['id']} — {' > '.join(l['path'])}" for l in toc["leaves"])


def prompt_ids(tokenizer, toc_str, question):
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"TABLE OF CONTENTS:\n{toc_str}\n\nQUESTION: {question}"},
    ]
    # Render to text first, then encode: apply_chat_template(tokenize=True) returns
    # different types across transformers versions; this always gives a list of ints.
    text = tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    return tokenizer.encode(text, add_special_tokens=False)


def target_ids(tokenizer, leaf_id):
    end = tokenizer.convert_tokens_to_ids("<|im_end|>")
    return tokenizer.encode(leaf_id, add_special_tokens=False) + [end]
