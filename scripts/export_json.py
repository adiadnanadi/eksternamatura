#!/usr/bin/env python3
"""Export quiz_final.json -> pitanja.json (web-app ready).

Math stays in LaTeX ($...$) for KaTeX/MathJax rendering.
Images are referenced as media/imageN.ext paths.
"""
import json
import re

SRC = "/home/z/my-project/work/quiz/quiz_final.json"
OUT = "/home/z/my-project/work/quiz/build/pitanja.json"

IMG_FULL = re.compile(r"@@IMG:([^:]+):([\d.]+):([\d.]+)@@")
P_SPLIT = "@@P@@"

def extract_images(s):
    return [{"file": f"media/{n}", "width_in": float(w), "height_in": float(h)}
            for n, w, h in IMG_FULL.findall(s)]

def clean_text(s):
    s = IMG_FULL.sub("", s)
    parts = [p.strip() for p in s.split(P_SPLIT) if p.strip()]
    return " ".join(parts)

def main():
    data = json.load(open(SRC, encoding="utf-8"))
    out = {
        "meta": {
            "title": "Matematika — banka pitanja za kviz",
            "count": len(data),
            "language": "bs",
            "math_format": "LaTeX (render with KaTeX or MathJax)",
            "note": "Pitanja izvorno iz Word dokumenta 'rjesenja tabela-MM'. Duplikat (izvorno pitanje 16) uklonjen; tačni odgovori usklađeni sa objašnjenjima.",
        },
        "questions": [],
    }
    for r in data:
        qimgs = extract_images(r["question"])
        opts = []
        for o in r["options"]:
            oimgs = extract_images(o["text"])
            opts.append({
                "label": o["label"],
                "text": clean_text(o["text"]),
                "image": oimgs[0]["file"] if oimgs else None,
            })
        sol_steps = [clean_text(p) for p in r["solution"]]
        sol_imgs = extract_images("@@".join(r["solution"]))
        out["questions"].append({
            "id": r["id"],
            "original_no": r["original_no"],
            "topic": r["topic"],
            "question": clean_text(r["question"]),
            "images": [i["file"] for i in qimgs],
            "options": opts,
            "correct_letter": r["correct_letter"],
            "correct_index": "ABCD".index(r["correct_letter"]),
            "solution": sol_steps,
            "solution_images": [i["file"] for i in sol_imgs],
        })
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"Wrote {OUT}: {len(out['questions'])} questions")

if __name__ == "__main__":
    main()
