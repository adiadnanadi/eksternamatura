#!/usr/bin/env python3
"""Show final quiz records."""
import json
import sys

with open("/home/z/my-project/work/quiz/quiz_final.json", encoding="utf-8") as f:
    data = json.load(f)

if sys.argv[1] == "all":
    recs = data
else:
    orig = [int(x) for x in sys.argv[1:]]
    recs = [r for r in data if r["original_no"] in orig]

for r in recs:
    print(f"#{r['id']}(orig {r['original_no']}) [{r['topic'][:20]}]")
    print(f"  Q: {r['question'][:220]}")
    for o in r["options"]:
        mark = " *" if o["label"] == r["correct_letter"] else ""
        print(f"   {o['label']}) {o['text'][:100]}{mark}")
    if r["solution"]:
        print(f"  SOL: {r['solution'][0][:180]}")
    print()
