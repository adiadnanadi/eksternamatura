#!/usr/bin/env python3
"""Find questions that lost their images between raw and final data."""
import json
import re

raw = {int(r["no"]): r for r in json.load(open("/home/z/my-project/work/quiz/quiz_raw.json", encoding="utf-8"))}
final = json.load(open("/home/z/my-project/work/quiz/quiz_final.json", encoding="utf-8"))

for r in final:
    o = int(r["original_no"])
    raw_imgs = re.findall(r"@@IMG:([^:]+):([\d.]+):([\d.]+)@@", raw[o]["question"])
    raw_opt_imgs = [(k, re.findall(r"@@IMG:([^:]+):([\d.]+):([\d.]+)@@", raw[o][k])) for k in ("a", "b", "c", "d")]
    fin_q_imgs = re.findall(r"@@IMG:([^:]+):(?:[\d.]+):(?:[\d.]+)@@", r["question"])
    raw_q_names = [n for n, w, h in raw_imgs]
    fin_q_names = fin_q_imgs
    missing_q = [x for x in raw_q_names if x not in fin_q_names]
    if missing_q:
        print(f"orig {o}: LOST question images: {missing_q} (raw markers: {raw_imgs})")
    # option images lost?
    for k, imgs in raw_opt_imgs:
        if imgs:
            # find corresponding final option
            idx = "abcd".index(k)
            if idx < len(r["options"]):
                fin_names = re.findall(r"@@IMG:([^:]+):(?:[\d.]+):(?:[\d.]+)@@", r["options"][idx]["text"])
                lost = [n for n, w, h in imgs if n not in fin_names]
                if lost:
                    print(f"orig {o}: LOST option {k.upper()} images: {lost}")
