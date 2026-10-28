#!/usr/bin/env python3
"""Anomaly scan over quiz_final.json."""
import json
import re

data = json.load(open("/home/z/my-project/work/quiz/quiz_final.json", encoding="utf-8"))

SUPS = "\u2070\u2071\u2074\u2075\u2076\u2077\u2078\u2079\u207b\u207c\u00b9\u00b2\u00b3"
issues = []
for r in data:
    fields = [("q", r["question"])] + [(o["label"], o["text"]) for o in r["options"]] + \
             [("sol", p) for p in r["solution"]]
    for where, s in fields:
        if re.search("[" + SUPS + "]", s):
            issues.append((r["original_no"], where, "unicode sup", s[:70]))
        # \cdot outside math
        outside = re.split(r"\$\$.*?\$\$|\$[^$]*\$", s)
        for o in outside:
            if "\\cdot" in o or "\\frac" in o or "\\sqrt" in o or "\\geq" in o:
                issues.append((r["original_no"], where, "latex cmd outside math", s[:70]))
                break
        if "@@P@@" in s and where == "q" and "@@IMG" not in s:
            issues.append((r["original_no"], where, "P marker in q", s[:70]))
        raw_greek = re.sub(r"\$[^$]*\$", "", s)
        if re.search("[\u0370-\u03ff]", raw_greek):
            issues.append((r["original_no"], where, "greek raw", s[:70]))
        if re.search(r"\bX\s*[<>]", s):
            issues.append((r["original_no"], where, "X var", s[:70]))
        if "$ $" in s or s.strip() == "$$":
            issues.append((r["original_no"], where, "empty math", s[:70]))
        if "\\ je" in s or "\\ da" in s or "\\ manji" in s:
            issues.append((r["original_no"], where, "escaped words in math", s[:70]))
        if "$$" in s:
            issues.append((r["original_no"], where, "display $$", s[:70]))

for i in issues:
    print(i)
print("total issues:", len(issues))
