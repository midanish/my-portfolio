"""Phase 5, step 2: fine-tune a small instruction model to output a valid leaf ID.

STAIR stage B, scaled down: the paper LoRA-tunes Mistral-7B-Instruct-v0.2
(r=16, alpha=32). Here: Qwen2.5-1.5B-Instruct with the same LoRA rank/alpha,
trained only on synthetic questions (research/stair/data/synthetic.jsonl).
The loss is computed on the target leaf ID only, not on the prompt.

    research/stair/.venv/Scripts/python research/stair/train_lora.py
"""
import json
import random
import time

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

from common import BASE_MODEL, HERE, load_toc, prompt_ids, target_ids, toc_text

EPOCHS = 3
LR = 2e-4
BATCH = 4
SEED = 7

random.seed(SEED)
torch.manual_seed(SEED)
device = "cuda"

rows = [json.loads(l) for l in (HERE / "data" / "synthetic.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
train = [r for r in rows if r["split"] == "train"]
dev = [r for r in rows if r["split"] == "dev"]
toc = load_toc()
toc_str = toc_text(toc)
valid_ids = {l["id"] for l in toc["leaves"]}
assert all(r["leaf_id"] in valid_ids for r in rows), "synthetic data refers to an unknown leaf"

tok = AutoTokenizer.from_pretrained(BASE_MODEL)
model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=torch.bfloat16).to(device)
model.gradient_checkpointing_enable()
model.enable_input_require_grads()
model = get_peft_model(model, LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05, task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
))
model.print_trainable_parameters()


def encode(r):
    p = prompt_ids(tok, toc_str, r["question"])
    t = target_ids(tok, r["leaf_id"])
    return p + t, [-100] * len(p) + t


def batches(data, shuffle):
    data = list(data)
    if shuffle:
        random.shuffle(data)
    for i in range(0, len(data), BATCH):
        enc = [encode(r) for r in data[i:i + BATCH]]
        width = max(len(x) for x, _ in enc)
        pad = tok.pad_token_id
        ids = torch.tensor([x + [pad] * (width - len(x)) for x, _ in enc], device=device)
        labels = torch.tensor([y + [-100] * (width - len(y)) for _, y in enc], device=device)
        mask = torch.tensor([[1] * len(x) + [0] * (width - len(x)) for x, _ in enc], device=device)
        yield ids, mask, labels


opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=LR)
steps_total = EPOCHS * ((len(train) + BATCH - 1) // BATCH)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: max(0.0, 1 - s / steps_total))

log = {"base_model": BASE_MODEL, "lora": {"r": 16, "alpha": 32, "targets": "q,k,v,o"},
       "epochs": EPOCHS, "lr": LR, "batch": BATCH, "train_n": len(train), "dev_n": len(dev), "epochs_log": []}
t0 = time.time()
for epoch in range(1, EPOCHS + 1):
    model.train()
    total, n = 0.0, 0
    for ids, mask, labels in batches(train, shuffle=True):
        loss = model(input_ids=ids, attention_mask=mask, labels=labels).loss
        loss.backward()
        opt.step()
        sched.step()
        opt.zero_grad()
        total += loss.item()
        n += 1
    model.eval()
    with torch.no_grad():
        dev_loss = [model(input_ids=i, attention_mask=m, labels=l).loss.item() for i, m, l in batches(dev, shuffle=False)]
    entry = {"epoch": epoch, "train_loss": round(total / n, 4), "dev_loss": round(sum(dev_loss) / max(1, len(dev_loss)), 4),
             "minutes": round((time.time() - t0) / 60, 1)}
    log["epochs_log"].append(entry)
    print(entry, flush=True)

out = HERE / "out"
out.mkdir(exist_ok=True)
model.save_pretrained(out / "adapter")
(out / "train_log.json").write_text(json.dumps(log, indent=2), encoding="utf-8")
print("saved adapter to", out / "adapter")
