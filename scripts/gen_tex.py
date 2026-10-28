#!/usr/bin/env python3
"""Generate kviz.tex from quiz_final.json.

Quiz-bank layout: numbered questions, options A)-D), green correct answer,
explanation below, embedded original figures, 7 topic sections.
"""
import json
import os
import re
import sys

SRC = "/home/z/my-project/work/quiz/quiz_final.json"
OUT = "/home/z/my-project/work/quiz/kviz.tex"
MEDIA_CHECK_DIR = "/home/z/my-project/work/quiz/media/media"  # actual image files

PREAMBLE = r"""% !TEX program = xelatex
\documentclass[10pt,a4paper]{article}

\usepackage{fontspec}
\setmainfont{lmroman10}[
  Extension = .otf,
  UprightFont = *-regular,
  BoldFont = *-bold,
  ItalicFont = *-italic,
  BoldItalicFont = *-bolditalic
]
\setsansfont{lmsans10}[
  Extension = .otf,
  UprightFont = *-regular,
  BoldFont = *-bold
]
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{geometry}
\usepackage{enumitem}
\usepackage{needspace}
\usepackage{icomma}
\usepackage[
    colorlinks=true,
    linkcolor=qnavy,
    citecolor=qnavy,
    urlcolor=qnavy,
    bookmarks=true,
    bookmarksnumbered=true,
    unicode=true
]{hyperref}

\geometry{a4paper, top=2.2cm, bottom=2.2cm, left=2.2cm, right=2.2cm}

\definecolor{qnavy}{HTML}{1F3A5F}
\definecolor{okgreen}{HTML}{15803D}
\definecolor{softgray}{HTML}{F4F6F8}

\widowpenalty=10000
\clubpenalty=10000
\tolerance=2000
\emergencystretch=1.5em
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

% ---- question header ----
\newcommand{\Qhead}[1]{%
  \needspace{7\baselineskip}%
  \vspace{9pt}%
  \noindent{\color{qnavy}\large\bfseries #1.}\;\ignorespaces
}

% ---- options list ----
\newlist{opcije}{itemize}{1}
\setlist[opcije]{label={}, leftmargin=1.9em, itemsep=1pt, topsep=2.5pt, parsep=0pt}
\newcommand{\optlabel}[1]{{\bfseries #1)}}
\newcommand{\optoklabel}[1]{{\bfseries\color{okgreen}#1)}}

% ---- solution list ----
\newlist{rjesenje}{itemize}{1}
\setlist[rjesenje]{label={}, leftmargin=1.1em, itemsep=0.5pt, topsep=2.5pt, parsep=0pt}
\newcommand{\solhead}{{\bfseries\color{qnavy}Rješenje:}\;}

\hypersetup{
    pdftitle={Matematika — banka pitanja za kviz},
    pdfauthor={Z.ai},
    pdfsubject={Banka kviz pitanja iz matematike sa odgovorima i rješenjima},
    pdfkeywords={matematika, kviz, pitanja, jednačine, funkcije, geometrija}
}

\begin{document}
"""

SECTION_TITLES = [
    "Brojevi i razlomci",
    "Djeljivost brojeva, prosti faktori, NZS i NZD",
    "Računske operacije, stepeni i algebraički izrazi",
    "Jednačine i nejednačine",
    "Tekstualni zadaci",
    "Linearna funkcija i proporcionalnost",
    "Geometrija",
]

def img_macro(marker: str) -> str:
    """@@IMG:name:Win: Hin@@ -> includegraphics."""
    m = re.match(r"@@IMG:([^:]+):([\d.]+):([\d.]+)@@", marker)
    if not m:
        return ""
    name, w, h = m.group(1), float(m.group(2)), float(m.group(3))
    path = f"media/{name}"
    if not os.path.exists(os.path.join(MEDIA_CHECK_DIR, name)):
        return ""
    wcm = min(w * 2.54, 7.5)
    hcm = min(h * 2.54, 5.5)
    return (f"\\begin{{center}}\\includegraphics[width={wcm:.2f}cm,height={hcm:.2f}cm,"
            f"keepaspectratio]{{{path}}}\\end{{center}}")

def esc_text(s: str) -> str:
    """Escape LaTeX specials in non-math segments; handle markers."""
    parts = re.split(r"(@@IMG:[^@]+@@)", s)
    out = []
    for p in parts:
        if p.startswith("@@IMG:"):
            out.append(img_macro(p))
            continue
        # escape specials outside math
        segs = re.split(r"(\$\$.*?\$\$|\$[^$]*\$)", p, flags=re.S)
        buf = []
        for seg in segs:
            if seg.startswith("$"):
                # display math $$..$$ -> \[..\]
                if seg.startswith("$$"):
                    body = seg.strip("$").strip()
                    buf.append("\\[" + body + "\\]")
                else:
                    buf.append(seg)
            else:
                t = seg.replace("\\", "\\textbackslash ")
                t = re.sub(r"\\textbackslash ", "\\\\textbackslash ", t)  # noop guard
                t = seg.replace("&", "\\&").replace("%", "\\%").replace("#", "\\#")
                t = t.replace("_", "\\_").replace("~", "\\textasciitilde ")
                t = t.replace("^", "\\textasciicircum ")
                buf.append(t)
        out.append("".join(buf))
    return "".join(out)

def render_question(rec, is_last=False) -> str:
    lines = []
    q = rec["question"]
    if is_last:
        # keep the final question whole on the last page (avoid 5-line orphan tail)
        lines.append("\\needspace{24\\baselineskip}")
    if q.startswith("RAW::"):
        # verbatim LaTeX passthrough (e.g. inline table)
        lines.append(f"\\Qhead{{{rec['id']}}}")
        lines.append(q[5:])
        body = "\n".join(lines)
        return body + "\n" + render_tail(rec)
    lines.append(f"\\Qhead{{{rec['id']}}}")
    # question paragraphs (text + images in order)
    paras = [p for p in q.split("@@P@@") if p.strip()]
    for i, p in enumerate(paras):
        is_img_only = re.fullmatch(r"(?:@@IMG:[^@]+@@\s*)+", p)
        if i == 0 and not is_img_only:
            txt = esc_text(p).strip()
            if txt.startswith("\\begin{center}"):
                lines.append(txt)
            else:
                lines.append(txt + "\n")
        else:
            lines.append(esc_text(p) + "\n")
    return "\n".join(lines) + "\n" + render_tail(rec)

def render_tail(rec) -> str:
    lines = []
    # options
    lines.append("\\begin{opcije}")
    for o in rec["options"]:
        lab = f"\\optoklabel{{{o['label']}}}" if o["label"] == rec["correct_letter"] \
              else f"\\optlabel{{{o['label']}}}"
        text_full = " ".join(p.strip() for p in o["text"].split("@@P@@") if p.strip())
        # image-only option -> label then image
        oimg = re.findall(r"@@IMG:[^@]+@@", text_full)
        if oimg and re.fullmatch(r"(?:@@IMG:[^@]+@@\s*)+", text_full):
            lines.append(f"\\item[{lab}]")
            lines.append(img_macro(oimg[0]))
        else:
            body = re.sub(r"@@IMG:[^@]+@@", "", text_full).strip()
            body = esc_text(body).strip()
            if o["label"] == rec["correct_letter"]:
                body = f"{{\\color{{okgreen}}{body}}}" if body else ""
                body += " {\\color{okgreen}$\\checkmark$}"
            lines.append(f"\\item[{lab}] {body}")
    lines.append("\\end{opcije}")
    # solution
    if rec["solution"]:
        lines.append("\\begin{rjesenje}")
        lines.append(f"\\item \\solhead {esc_text(rec['solution'][0]).strip()}")
        for step in rec["solution"][1:]:
            s = esc_text(step).strip()
            lines.append(f"\\item {s}")
        lines.append("\\end{rjesenje}")
    return "\n".join(lines)

INTRO = r"""\section*{O dokumentu}
\addcontentsline{toc}{section}{O dokumentu}

Ovaj dokument predstavlja kompletnu banku pitanja iz matematike sačinjenu od 267 zatvorenih pitanja (multiple choice) sa ponuđena četiri odgovora, označenim tačnim odgovorom i koracima rješenja. Pitanja su preuzeta iz originalnog Word dokumenta, a sve matematičke formule (razlomci, stepeni, korijeni, jednačine i nejednačine) su pretvorene u LaTeX matematički zapis, pa su izrazi pregledno i precizno prikazani. Originalne grafike i skice (grafici funkcija, geometrijske figure i konstrukcije) su izvučene iz dokumenta i ugrađene uz pitanja kojima pripadaju.

Pitanja su grupisana u sedam oblasti: brojevi i razlomci; djeljivost brojeva, prosti faktori, NZS i NZD; računske operacije, stepeni i algebraički izrazi; jednačine i nejednačine; tekstualni zadaci; linearna funkcija i proporcionalnost; te geometrija. Pri prenošenju sadržaja učinjene su sljedeće dorade: uklonjen je jedan duplikat pitanja (originalno pitanje 16 bilo je identično pitanju 15, pa pitanja imaju redne brojeve 1--267); usklađeni su pojedinačni tačni odgovori sa priloženim objašnjenjima; ispravljene su sitne štamparske greške u formulama i koracima rješenja; a kod pitanja čija se slika nije nalazila u originalnom dokumentu dodata je odgovarajuća napomena.

Svako pitanje je prikazano u istom formatu: redni broj i tekst pitanja, (po potrebi) grafika, opcije \textbf{A)}--\textbf{D)}, pri čemu je tačan odgovor obojen zeleno i označen znakom provjere, te blok \textbf{Rješenje} sa koracima postupka. Pored ovog PDF-a, u okviru isporuke se nalazi i JSON fajl sa svim pitanjima u strukturiranom obliku, spremnim za uvoz u kviz web aplikaciju (matematički izrazi su u LaTeX zapisu pogodnom za prikaz putem MathJax ili KaTeX biblioteka).
"""

def main():
    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)

    doc = [PREAMBLE]
    doc.append("\\tableofcontents")
    doc.append("")
    doc.append(INTRO)
    doc.append("\\newpage")
    doc.append("")

    cur_topic = None
    last_id = data[-1]["id"]
    for rec in data:
        if rec["topic"] != cur_topic:
            cur_topic = rec["topic"]
            doc.append(f"\\section{{{cur_topic}}}")
            doc.append("")
        doc.append(render_question(rec, is_last=(rec["id"] == last_id)))
        doc.append("")

    doc.append("\\end{document}")
    tex = "\n".join(doc)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(tex)
    print(f"Wrote {OUT} ({len(tex)} chars, {len(data)} questions)", file=sys.stderr)

if __name__ == "__main__":
    main()
