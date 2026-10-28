#!/usr/bin/env python3
"""Parse pandoc grid-table of quiz questions into structured JSON (position-based).

Handles: inline images, paragraph breaks inside cells, pandoc markdown artifacts.

Input : /home/z/my-project/work/quiz/extracted2.md
Output: /home/z/my-project/work/quiz/quiz_raw.json
"""
import json
import re
import sys

SRC = "/home/z/my-project/work/quiz/extracted2.md"
OUT = "/home/z/my-project/work/quiz/quiz_raw.json"

IMG_RE = re.compile(r'!\[\]\(media/media/(image\d+\.\w+)\)\{width="([\d.]+)in"(?: height="([\d.]+)in")?\}')

def img_marker(m):
    w = float(m.group(2))
    h = float(m.group(3)) if m.group(3) else 0
    # return a marker; keep inches for later cm conversion
    return f"@@IMG:{m.group(1)}:{w:.2f}:{h:.2f}@@"

def clean_math(s: str) -> str:
    def unbold(m):
        inner = m.group(1)
        inner = re.sub(r"\\mathbf\{([^{}]*)\}", r"\1", inner)
        return inner
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\\mathbf\{((?:[^{}]|\{[^{}]*\})*)\}", unbold, s)
        s = re.sub(r"\\boldsymbol\{((?:[^{}]|\{[^{}]*\})*)\}", unbold, s)
        s = re.sub(r"\\bm\{((?:[^{}]|\{[^{}]*\})*)\}", unbold, s)
        s = re.sub(r"\\mathrm\{((?:[^{}]|\{[^{}]*\})*)\}", r"\1", s)
    return s

def unescape_text(s: str) -> str:
    """Unescape pandoc escapes ONLY outside math delimiters."""
    parts = re.split(r"(\$\$.*?\$\$|\$[^$]*\$)", s, flags=re.S)
    out = []
    for p in parts:
        if p.startswith("$"):
            out.append(p)
        else:
            p = p.replace("\\|", "|").replace("\\$", "$")
            p = re.sub(r"\\([()\[\]<>{}\\%,#!*_])", r"\1", p)
            out.append(p)
    return "".join(out)

def unmarkdown(s: str) -> str:
    # images first
    s = IMG_RE.sub(img_marker, s)
    # bold/italic
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\*([^*]+)\*", r"\1", s)
    # en-dash as minus
    s = re.sub(r"\s--\s", " - ", s)
    s = re.sub(r"(?<=[\s(\[])--(?=\s)", "-", s)
    # right single quote
    s = s.replace("\u2019", "'")
    return s

def strip_cell(s: str) -> str:
    s = re.sub(r"^####\s*", "", s.strip())
    return s.strip()

def process_cell(raw: str, is_math_field: bool) -> str:
    """raw = multi-line cell content. Returns paragraphs joined by @@P@@."""
    lines = raw.split("\n")
    paras = []
    cur = []
    for ln in lines:
        lnc = re.sub(r"^####\s*", "", ln.strip())
        if lnc == "":
            if cur:
                paras.append(" ".join(cur))
                cur = []
        else:
            cur.append(lnc)
    if cur:
        paras.append(" ".join(cur))
    paras = [p for p in paras if p]
    txt = "@@P@@".join(paras)
    txt = unmarkdown(txt)
    txt = unescape_text(txt)
    if is_math_field:
        txt = clean_math(txt)
    # collapse spaces (but not inside markers)
    parts = re.split(r"(@@IMG:[^@]*@@|@@P@@)", txt)
    parts = [re.sub(r"\s+", " ", p).strip() if not p.startswith("@@") else p for p in parts]
    return "".join(parts)

def main():
    with open(SRC, encoding="utf-8") as f:
        lines = f.read().split("\n")

    sep_idx = []
    for i, ln in enumerate(lines):
        st = ln.strip()
        if st.startswith("+") and st.endswith("+") and set(st) <= set("+-= "):
            sep_idx.append(i)

    first_sep = lines[sep_idx[0]]
    positions = [m.start() for m in re.finditer(r"\+", first_sep)]
    ncols = len(positions) - 1

    groups = []
    for k in range(len(sep_idx) - 1):
        a, b = sep_idx[k] + 1, sep_idx[k + 1]
        seg = lines[a:b]
        if not seg:
            continue
        cells = [""] * ncols
        for ln in seg:
            for c in range(ncols):
                lo = positions[c] + 1
                hi = positions[c + 1]
                chunk = ln[lo:hi] if len(ln) > lo else ""
                cells[c] += chunk + "\n"
        groups.append(cells)

    header = [strip_cell(process_cell(c, False).replace("@@P@@", " ")) for c in groups[0]]
    print("HEADER:", header, file=sys.stderr)

    data = []
    for g in groups[1:]:
        rec = {
            "no": strip_cell(process_cell(g[0], False)),
            "question": process_cell(g[1], True),
            "a": process_cell(g[2], True),
            "b": process_cell(g[3], True),
            "c": process_cell(g[4], True),
            "d": process_cell(g[5], True),
            "correct": process_cell(g[6], True),
            "solution": process_cell(g[7], True),
        }
        data.append(rec)

    # drop rows with no number (continuation rows should not exist, but just in case)
    before = len(data)
    data = [r for r in data if r["no"]]
    if before != len(data):
        print(f"WARN: dropped {before-len(data)} rows with empty no", file=sys.stderr)

    print(f"Total data rows: {len(data)}", file=sys.stderr)
    nums = [r["no"] for r in data]
    ints = []
    for n in nums:
        try:
            ints.append(int(n))
        except ValueError:
            ints.append(None)
    missing = [i for i in range(1, max(x for x in ints if x) + 1) if i not in ints]
    print(f"Missing numbers: {missing}", file=sys.stderr)
    img_count = sum(f.count("@@IMG:") for r in data for f in [r["question"], r["a"], r["b"], r["c"], r["d"], r["correct"], r["solution"]])
    print(f"Image markers: {img_count}", file=sys.stderr)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {OUT}", file=sys.stderr)

if __name__ == "__main__":
    main()
