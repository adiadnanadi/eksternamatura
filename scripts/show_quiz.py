#!/usr/bin/env python3
"""Pretty-print selected quiz records for inspection."""
import json
import sys

with open("/home/z/my-project/work/quiz/quiz_raw.json", encoding="utf-8") as f:
    data = json.load(f)

ids = [int(x) for x in sys.argv[1:]]
for i in ids:
    r = data[i - 1]
    print(f"=== #{r['no']} ===")
    print(f"Q: {r['question']}")
    print(f"  a: {r['a']}")
    print(f"  b: {r['b']}")
    print(f"  c: {r['c']}")
    print(f"  d: {r['d']}")
    print(f"  OK: {r['correct']!r}")
    print(f"  SOL: {r['solution'][:400]}")
    print()
