#!/usr/bin/env python3
"""Dump all quiz records to a compact review file."""
import json

with open("/home/z/my-project/work/quiz/quiz_raw.json", encoding="utf-8") as f:
    data = json.load(f)

with open("/home/z/my-project/work/quiz/review.txt", "w", encoding="utf-8") as f:
    for r in data:
        f.write(f"#{r['no']} | Q: {r['question']}\n")
        f.write(f"   a: {r['a']}\n   b: {r['b']}\n   c: {r['c']}\n   d: {r['d']}\n")
        f.write(f"   OK: {r['correct']} | SOL: {r['solution']}\n\n")
print("done")
