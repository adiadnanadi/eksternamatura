#!/usr/bin/env python3
"""Build final cleaned quiz data: auto-clean + per-question fixes + dedupe + sections.

Input : work/quiz/quiz_raw.json
Output: work/quiz/quiz_final.json
"""
import json
import re
import sys

RAW = "/home/z/my-project/work/quiz/quiz_raw.json"
OUT = "/home/z/my-project/work/quiz/quiz_final.json"

GREEK = {
    "α": "\\alpha ", "β": "\\beta ", "γ": "\\gamma ", "δ": "\\delta ",
    "ε": "\\varepsilon ", "θ": "\\theta ", "λ": "\\lambda ", "μ": "\\mu ",
    "π": "\\pi ", "ρ": "\\rho ", "σ": "\\sigma ", "φ": "\\varphi ", "ω": "\\omega ",
    "Γ": "\\Gamma ", "Δ": "\\Delta ", "Θ": "\\Theta ", "Λ": "\\Lambda ",
    "Π": "\\Pi ", "Σ": "\\Sigma ", "Φ": "\\Phi ", "Ψ": "\\Psi ", "Ω": "\\Omega ",
}
SUP_MAP = {"⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
           "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9"}

def split_math(s):
    """Split string into (is_math, text) segments."""
    return [(m.start(), m.group()) for m in re.finditer(r"\$\$.*?\$\$|\$[^$]*\$", s, re.S)]

def conv_sup(m):
    body = m.group(0)
    k = len(body)
    while k > 0 and body[k - 1] in SUP_MAP:
        k -= 1
    core, sup = body[:k], body[k:]
    sup = "".join(SUP_MAP[c] for c in sup)
    return f"${core}^{{{sup}}}$"

def conv_sup_markup(m):
    return f"${m.group(1)}^{{{m.group(2)}}}$"

def auto_clean(s: str) -> str:
    if s is None:
        return ""
    # pandoc artifacts
    s = s.replace("`<!-- -->`{=html}", "")
    s = re.sub(r"\[([^\]]+)\]\{\.underline\}", r"\1", s)
    # long dash rule runs (table borders)
    s = re.sub(r"-{5,}", " ", s)
    s = re.sub(r"\s-{3,}\s", " ", s)
    # degree: 90^0^ -> 90°  (before generic superscript)
    s = re.sub(r"(\d)\^0\^(?![0-9])", r"\1°", s)
    # text ${^\circ}$ -> °
    s = s.replace("${^\\circ}$", "°")
    # unicode superscripts -> math (exclude superscript chars from the base class)
    SUPS = "\u2070\u00b9\u00b3\u2074-\u2079\u00b2"
    s = re.sub(r"(?:(?![" + SUPS + r"])[\w\)\]])+[" + SUPS + r"]+", conv_sup, s)
    # trailing lone superscript after $...$
    s = re.sub(r"\$([\w\)\]\\]+)\$([\u2070\u00b9\u00b3\u2074-\u2079\u00b2]+)",
               lambda m: f"${m.group(1)}^{{{SUP_MAP.get(m.group(2), '')}}}$", s)
    # ^x^ markup -> math
    s = re.sub(r"([\w\)\]]+)\^([A-Za-z0-9+\-]+)\^", conv_sup_markup, s)
    # unicode italic/bold math letters -> ascii (Mathematical Alphanumeric Symbols)
    def plain_math_ch(c):
        d = ord(c) - 0x1D400
        if 0 <= d <= 0x1D7FF:
            base = d % 52
            ch = chr(ord("A") + base) if base < 26 else chr(ord("a") + base - 26)
            return ch
        return c
    s = "".join(plain_math_ch(c) if 0x1D400 <= ord(c) <= 0x1D7FF else c for c in s)
    # misc operators
    s = s.replace("\u2236", " : ")
    s = s.replace("∙", " \\cdot ").replace("⋅", " \\cdot ")
    s = s.replace("−", "-").replace("–", "-").replace("—", "-")
    s = s.replace("′", "'")
    s = s.replace(">>", "").replace("≫", ">>")
    # math-mode cleanups: \bullet -> \cdot ; collapse \ spacing runs ; mathbf leftovers
    DIAC = "čćšžđČĆŠŽĐ"
    def fix_math_seg(seg):
        if not seg.startswith("$"):
            return seg
        body = seg.strip("$")
        # math segments that are actually words (Bosnian diacritics or pure uppercase) -> text
        if re.search("[" + DIAC + "]", body) and "\\" not in body:
            return body.strip()
        if re.fullmatch(r"[A-Z][A-Z\\s,\.]*", body.strip()) and "\\" not in body:
            return body.strip()
        body = body.replace("\\bullet", "\\cdot")
        body = re.sub(r"(\\ )+", " ", body)
        body = re.sub(r"\\mathbf\{([^{}]*)\}", r"\1", body)
        body = re.sub(r"\s+", " ", body).strip()
        return f"${body}$" if body else ""
    # apply to each math segment
    out, last = [], 0
    for m in re.finditer(r"\$\$.*?\$\$|\$[^$]*\$", s, re.S):
        out.append(s[last:m.start()])
        out.append(fix_math_seg(m.group()))
        last = m.end()
    out.append(s[last:])
    s = "".join(out)
    # misplaced option-letter math: C$) -> C) $
    s = re.sub(r"([A-D])\$([)\]])", r"\1\2 $", s)
    # Greek letters in TEXT -> inline math
    out, last = [], 0
    for m in re.finditer(r"\$\$.*?\$\$|\$[^$]*\$", s, re.S):
        txt = s[last:m.start()]
        g = "".join(("$" + GREEK[c].strip() + "$") if c in GREEK else c for c in txt)
        out.append(g)
        out.append(m.group())
        last = m.end()
    txt = s[last:]
    g = "".join(("$" + GREEK[c].strip() + "$") if c in GREEK else c for c in txt)
    out.append(g)
    s = "".join(out)
    # stray symbols in text -> math
    for ch, rep in [("≈", r"$\approx$"), ("∈", r"$\in$"), ("→", r"$\rightarrow$"),
                    ("⇒", r"$\Rightarrow$"), ("∥", r"$\parallel$"), ("∞", r"$\infty$"),
                    ("Δ", r"$\Delta$")]:
        # skip occurrences already inside math
        out, last = [], 0
        for m in re.finditer(r"\$\$.*?\$\$|\$[^$]*\$", s, re.S):
            out.append(s[last:m.start()].replace(ch, rep))
            out.append(m.group())
            last = m.end()
        out.append(s[last:].replace(ch, rep))
        s = "".join(out)
    # space after math before letter: $x$napiši -> $x$ napiši
    s = re.sub(r"\$(?=[A-Za-zčćšžđČĆŠŽĐ])", "$ ", s)
    s = re.sub(r"(?<=[A-Za-zčćšžđČĆŠŽĐ])\$", " $", s)
    # spaces before punctuation
    s = re.sub(r"\s+([,.?!;:])", r"\1", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    # merge adjacent math segments: $a$ $b$ -> $a b$ (and $$a$$ $$b$$)
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\$\$([^$]+)\$\$\s*\$\$([^$]+)\$\$", r"$$\1 \2$$", s)
        s = re.sub(r"\$([^$]+)\$\s*\$([^$]+)\$", r"$\1 \2$", s)
    return s

def to_latex_text(s: str) -> str:
    """Escape LaTeX specials in TEXT (non-math) segments only."""
    out, last = [], 0
    for m in re.finditer(r"\$\$.*?\$\$|\$[^$]*\$", s, re.S):
        txt = s[last:m.start()]
        txt = txt.replace("&", "\\&").replace("%", "\\%").replace("#", "\\#")
        txt = txt.replace("_", "\\_").replace("~", "\\textasciitilde ")
        out.append(txt)
        out.append(m.group())
        last = m.end()
    txt = s[last:]
    txt = txt.replace("&", "\\&").replace("%", "\\%").replace("#", "\\#")
    txt = txt.replace("_", "\\_").replace("~", "\\textasciitilde ")
    out.append(txt)
    return "".join(out)

# ---------------------------------------------------------------- overrides
# RAW:: prefix = insert verbatim (already LaTeX), @@P@@ = paragraph break
OV = {
    33: {"q": "Koji od brojeva: $-\\frac{7}{2},\\ -\\frac{5}{3},\\ -\\frac{3}{2},\\ -\\frac{2}{3}$ je manji od $-\\frac{5}{2}$?",
         "sol": ["Poredajmo: $-\\frac{7}{2} = -\\frac{21}{6}$, $-\\frac{5}{3} = -\\frac{10}{6}$, $-\\frac{3}{2} = -\\frac{9}{6}$, $-\\frac{2}{3} = -\\frac{4}{6}$ i $-\\frac{5}{2} = -\\frac{15}{6}$.",
                 "Pošto je $-\\frac{21}{6} < -\\frac{15}{6}$, broj $-\\frac{7}{2}$ je manji od $-\\frac{5}{2}$."]},
    34: {"sol": ["Poredak od najmanjeg ka najvećem: $-\\frac{1}{7} < 0 < \\frac{1}{7} < \\frac{3}{7}$."]},
    38: {"sol": ["$6 = 2 \\cdot 3$, $15 = 3 \\cdot 5$", "$NZS(6, 15) = 2 \\cdot 3 \\cdot 5 = 30$"]},
    39: {"sol": ["$12 = 2^{2} \\cdot 3$, $15 = 3 \\cdot 5$, $18 = 2 \\cdot 3^{2}$", "$NZS(12, 15, 18) = 2^{2} \\cdot 3^{2} \\cdot 5 = 180$"]},
    40: {"sol": ["$10 = 2 \\cdot 5$, $12 = 2^{2} \\cdot 3$, $25 = 5^{2}$", "$NZS(10, 12, 25) = 2^{2} \\cdot 3 \\cdot 5^{2} = 300$"]},
    41: {"sol": ["$18 = 2 \\cdot 3^{2}$, $24 = 2^{3} \\cdot 3$", "$NZD(18, 24) = 2 \\cdot 3 = 6$"]},
    42: {"sol": ["$22 = 2 \\cdot 11$, $33 = 3 \\cdot 11$, $55 = 5 \\cdot 11$", "$NZD(22, 33, 55) = 11$"]},
    43: {"sol": ["Broj je djeljiv sa 6 ako je djeljiv i sa 2 i sa 3.", "Broj 78 je paran, a zbir cifara $7 + 8 = 15$ je djeljiv sa 3, pa je 78 djeljiv sa 6."]},
    44: {"sol": ["Broj je djeljiv sa 15 ako je djeljiv i sa 3 i sa 5.", "Broj 75 završava cifrom 5, a zbir cifara $7 + 5 = 12$ je djeljiv sa 3, pa je 75 djeljiv sa 15."]},
    45: {"sol": ["Broj je djeljiv i sa 6 i sa 15 ako je djeljiv sa 2, sa 3 i sa 5.", "Broj 120 završava cifrom 0 (djeljiv sa 2 i sa 5), a zbir cifara $1 + 2 + 0 = 3$ je djeljiv sa 3, pa je 120 djeljiv i sa 6 i sa 15."]},
    47: {"q": "Koliko je $-5 \\cdot (-7)$?", "sol": ["$-5 \\cdot (-7) = +35 = 35$"]},
    48: {"q": "Koliko je $-12 + (-6)$?", "sol": ["$-12 + (-6) = -12 - 6 = -18$"]},
    50: {"q": "Pomnožiti stepene: $3^{4} \\cdot 3^{10}$.", "a": "$(-3)^{14}$", "b": "$3^{14}$", "c": "$-3^{40}$", "d": "$3^{40}$",
         "sol": ["$3^{4} \\cdot 3^{10} = 3^{4+10} = 3^{14}$"]},
    80: {"q": "Koji broj treba dodati broju $-\\frac{3}{4}$ da bi se dobio broj $5\\frac{7}{8}$?",},
    52: {"q": "Koliko je $1 - (10 - 15)$?", "sol": ["$1 - (10 - 15) = 1 - (-5) = 1 + 5 = 6$"]},
    53: {"q": "Koliko je $-[-(-2)]$?", "sol": ["$-[-(-2)] = -[2] = -2$"]},
    55: {"q": "Ako jedan školski čas traje 45 minuta, koliko je $\\frac{1}{5}$ tog časa?",
         "sol": ["$\\frac{1}{5} \\cdot 45 = 9$ minuta."]},
    56: {"sol": ["Mahir ima 7 ocjena: 3, 3, 4, 4, 5, 5 i 4.", "Zbir ocjena je $3 + 3 + 4 + 4 + 5 + 5 + 4 = 28$, pa je srednja ocjena $28 : 7 = 4{,}00$."]},
    57: {"q": "Uprosti izraz: $5x \\cdot 5x - 4x \\cdot 4x + 3x \\cdot 3x$.",
         "sol": ["$5x \\cdot 5x - 4x \\cdot 4x + 3x \\cdot 3x = 25x^{2} - 16x^{2} + 9x^{2} = 18x^{2}$"]},
    58: {"q": "Izračunaj vrijednost izraza: $1^{0} + 2^{0} + 3^{0} + 4^{0}$.",
         "sol": ["$1^{0} + 2^{0} + 3^{0} + 4^{0} = 1 + 1 + 1 + 1 = 4$"]},
    59: {"q": "Izračunaj vrijednost izraza: $3^{0} + 3^{1} + 3^{2} + 3^{3}$.",
         "sol": ["$3^{0} + 3^{1} + 3^{2} + 3^{3} = 1 + 3 + 9 + 27 = 40$"]},
    60: {"q": "Pomnoži: $2^{3} \\cdot 2 \\cdot 2^{2}$.",
         "sol": ["$2^{3} \\cdot 2 \\cdot 2^{2} = 8 \\cdot 2 \\cdot 4 = 64$"]},
    61: {"q": "Koliko je $2^{4} + 4^{2}$?", "sol": ["$2^{4} + 4^{2} = 16 + 16 = 32$"]},
    64: {"sol": ["$[-13 + (-45)] + (-6) = -13 - 45 - 6 = -58 - 6 = -64$"]},
    66: {"q": "Izračunaj: $ (3 - 4) - (-2 + 7) = $", "sol": ["$(3 - 4) - (-2 + 7) = (-1) - (5) = -1 - 5 = -6$"]},
    67: {"q": "Izračunaj: $-6 \\cdot (8 + 2) + 42 : (-6) = $",
         "sol": ["$-6 \\cdot (8 + 2) + 42 : (-6) = -6 \\cdot 10 + (-7) = -60 - 7 = -67$"]},
    68: {"q": "Izvrši naznačene operacije: $(-2)^{3} + 3^{2} - 1^{10}$",
         "sol": ["$(-2)^{3} + 3^{2} - 1^{10} = -8 + 9 - 1 = 0$"]},
    69: {"q": "Izračunati vrijednost datog izraza: $a^{5} + a^{4} + a^{3} + a^{2} + a$ za $a = -1$.",
         "sol": ["$(-1)^{5} + (-1)^{4} + (-1)^{3} + (-1)^{2} + (-1) = -1 + 1 - 1 + 1 - 1 = -1$"]},
    71: {"q": "Izvrši naznačene operacije: $(-a^{3})^{2} + a^{4} \\cdot a^{2} - a^{8} : a^{2}$.",
         "sol": ["$(-a^{3})^{2} + a^{4} \\cdot a^{2} - a^{8} : a^{2} = a^{2 \\cdot 3} + a^{4+2} - a^{8-2} = a^{6} + a^{6} - a^{6} = a^{6}$"]},
    72: {"q": "Izvrši naznačene operacije: $4 \\cdot [(8 - 3) \\cdot 2 + 6] - 20$.",
         "sol": ["$4 \\cdot [5 \\cdot 2 + 6] - 20 = 4 \\cdot 16 - 20 = 64 - 20 = 44$"]},
    74: {"q": "Ako je $a = -1$, koliko je $a^{117}$?",
         "sol": ["$(-1)^{117} = -1$. Kada je eksponent stepena negativnog broja neparan broj, tada rezultat ostaje negativan."]},
    75: {"q": "Izvrši naznačene operacije: $(-3)^{2} \\cdot (-2)^{3} \\cdot (-1)$.",
         "sol": ["$(-3)^{2} \\cdot (-2)^{3} \\cdot (-1) = 9 \\cdot (-8) \\cdot (-1) = 72$"]},
    77: {"q": "Izvrši naznačene operacije: $105 : (-3) + 21 \\cdot (-3)$.",
         "sol": ["$105 : (-3) + 21 \\cdot (-3) = -35 + (-63) = -35 - 63 = -98$"]},
    84: {"q": "Izvrši naznačene operacije: $[-85 - 100 \\cdot (69 - 586) \\cdot 3 + 999] \\cdot 0$.",
         "sol": ["$[-85 - 100 \\cdot (69 - 586) \\cdot 3 + 999] \\cdot 0 = 0$", "Bez obzira na vrijednost izraza u zagradi, zagrada je pomnožena sa 0, pa je rezultat 0."]},
    85: {"q": "Izvrši naznačene operacije: $(2a - 1)^{2} - (1 - 2a)^{2}$.",
         "sol": ["$(2a - 1)^{2} - (1 - 2a)^{2} = 4a^{2} - 4a + 1 - (1 - 4a + 4a^{2}) = 0$"]},
    86: {"q": "Neka je $A = 0{,}05 + (0{,}9 - 0{,}02) : 0{,}1$ i $B = (3 - 2{,}5) \\cdot 0{,}5$. Odrediti $\\frac{A}{B}$."},
    89: {"q": "Dat je trinom $x^{2} + 6x + a$. Za koju vrijednost promjenjive $a$ dati izraz može biti potpuni kvadrat binoma?",
         "sol": ["$x^{2} + 6x + a = x^{2} + 2 \\cdot 3 \\cdot x + 3^{2} \\Rightarrow a = 3^{2}$, tj. $a = 9$."]},
    90: {"q": "Kvadriraj binom: $(\\sqrt{2} + \\sqrt{3})^{2}$.",
         "sol": ["$(\\sqrt{2} + \\sqrt{3})^{2} = (\\sqrt{2})^{2} + 2 \\cdot \\sqrt{2} \\cdot \\sqrt{3} + (\\sqrt{3})^{2} = 2 + 2\\sqrt{6} + 3 = 5 + 2\\sqrt{6}$"]},
    91: {"q": "Napiši brojni izraz u razvijenom obliku: $(x - 4) \\cdot (x + 4) - (x + 4)^{2}$.",
         "sol": ["$(x - 4)(x + 4) - (x + 4)^{2} = x^{2} - 16 - (x^{2} + 8x + 16) = -8x - 32 = -8(x + 4)$"]},
    92: {"sol": ["$60 = 2^{2} \\cdot 3 \\cdot 5 = 2^{2} \\cdot 15$, pa je $n = 3 \\cdot 5 = 15$.", "$60 \\cdot 15 = 900 = 30^{2}$."]},
    93: {"sol": ["$(2b - 3a)^{2} = 4b^{2} - 2 \\cdot 2b \\cdot 3a + 9a^{2} = 4b^{2} - 12ab + 9a^{2}$"]},
    95: {"q": "Koja od navedenih jednačina za rješenje ima broj 5?",
         "a": "$5x = 0$", "b": "$x + 5 = 0$", "c": "$2(x + 5) = 2$", "d": "$\\frac{1}{5}x + 2 = 3$",
         "sol": ["$\\frac{1}{5}x + 2 = 3$", "$\\frac{1}{5}x = 1$", "$x = 1 : \\frac{1}{5} = 5$"]},
    96: {"q": "Riješiti jednačinu: $-x + 3 = 0$", "sol": ["$-x + 3 = 0$", "$-x = -3$", "$x = 3$"]},
    97: {"q": "Riješiti jednačinu: $x + 0{,}4 = 1{,}2$.",
         "sol": ["$x + 0{,}4 = 1{,}2$", "$x = 1{,}2 - 0{,}4$", "$x = 0{,}8$"]},
    98: {"q": "Koliko ima prirodnih brojeva koji zadovoljavaju nejednakost $a^{2} < 8$?",
         "sol": ["$a^{2} < 8 \\Rightarrow a \\in \\{1, 2\\}$, tj. dva prirodna broja zadovoljavaju nejednačinu."]},
    99: {"a": "$1^{3} = 3$", "b": "$x = -x$", "c": "$0{,}2 \\cdot 5 = 0{,}1$", "d": "$1 : 2 = 0{,}5$"},
    100: {"q": "Riješiti jednačinu: $2 - x = -0{,}5$.",
          "sol": ["$2 - x = -0{,}5$", "$x = 2 + 0{,}5$", "$x = 2{,}5$"]},
    101: {"q": "Riješiti jednačinu: $31 + x = -19$.",
          "sol": ["$31 + x = -19$", "$x = -19 - 31$", "$x = -50$"]},
    102: {"q": "Riješiti jednačinu: $2x - 3x = -7$.",
          "sol": ["$2x - 3x = -7$", "$-x = -7$", "$x = 7$"]},
    103: {"a": "$-1{,}41 < -1{,}42$", "b": "$2{,}9 < 2{,}10$", "c": "$2{,}09 < 2{,}10$", "d": "$\\frac{1}{4} < -\\frac{1}{3}$"},
    104: {"q": "Riješiti jednačinu: $0{,}2 - x = 2{,}25$",
          "sol": ["$0{,}2 - x = 2{,}25$", "$x = 0{,}2 - 2{,}25$", "$x = -2{,}05$"]},
    105: {"q": "Riješiti jednačinu: $-x - 1 = -5$",
          "sol": ["$-x - 1 = -5$", "$-x = -5 + 1$", "$-x = -4$", "$x = 4$"]},
    107: {"q": "Riješiti jednačinu: $x - 0{,}11 = 0{,}11$",
          "sol": ["$x - 0{,}11 = 0{,}11$", "$x = 0{,}11 + 0{,}11$", "$x = 0{,}22$"]},
    108: {"q": "Riješiti jednačinu: $x - (15 + 10) = -25$",
          "sol": ["$x - (15 + 10) = -25$", "$x - 25 = -25$", "$x = -25 + 25$", "$x = 0$"]},
    110: {"q": "Napisati nejednačinu kojoj odgovara grafički prikaz rješenja:\n\n@@IMG:image1.jpeg:1.10:0.18@@",
          "a": "$x < 9$", "b": "$x > 9$", "c": "$x \\leq 9$", "d": "$x \\geq 9$"},
    111: {"q": "Riješiti jednačinu: $0{,}75 - 0{,}25 = x - 2$",
          "sol": ["$0{,}75 - 0{,}25 = x - 2$", "$0{,}5 = x - 2$", "$x = 0{,}5 + 2$", "$x = 2{,}5$"]},
    112: {"q": "Riješiti jednačinu: $2 - x = -\\frac{18}{3}$.",
          "sol": ["$2 - x = -\\frac{18}{3}$", "$2 - x = -6$", "$x = 2 + 6$", "$x = 8$"]},
    114: {"sol": ["$3{,}08 - 2x = -3{,}92$", "$2x = 3{,}08 + 3{,}92$", "$2x = 7$", "$x = 7 : 2$", "$x = 3{,}5$"]},
    115: {"q": "Riješiti jednačinu: $\\frac{2x - 11}{6} = \\frac{3 - x}{2}$",
          "sol": ["$\\frac{2x - 11}{6} = \\frac{3 - x}{2} \\;\\; (\\cdot\\, 6)$", "$2x - 11 = 3(3 - x)$", "$2x - 11 = 9 - 3x$", "$2x + 3x = 9 + 11$", "$5x = 20$", "$x = 4$"]},
    116: {"q": "Riješiti nejednačinu: $\\frac{3x - 1}{2} \\leq 4$",
          "sol": ["$\\frac{3x - 1}{2} \\leq 4 \\;\\; (\\cdot\\, 4)$", "$2(3x - 1) \\leq 16$", "$6x - 2 \\leq 16$", "$6x \\leq 18$", "$x \\leq 3$"]},
    117: {"q": "Riješiti jednačinu: $\\left(0{,}4 + \\frac{1}{2}\\right) \\cdot x = 1{,}8$",
          "sol": ["$\\left(0{,}4 + \\frac{1}{2}\\right) \\cdot x = 1{,}8$", "$0{,}9 \\cdot x = 1{,}8$", "$x = 1{,}8 : 0{,}9$", "$x = 2$"]},
    118: {"q": "Riješiti jednačinu: $\\frac{x + 3}{2} = -0{,}5$",
          "sol": ["$\\frac{x + 3}{2} = -0{,}5$", "$x + 3 = -1$", "$x = -1 - 3$", "$x = -4$"]},
    119: {"sol": ["$x : 2{,}3 = 11$", "$x = 11 \\cdot 2{,}3$", "$x = 25{,}3$, tj. 25,3 jeste rješenje jednačine."]},
    120: {"q": "Riješiti jednačinu: $-6{,}25 : x = 1{,}25$",
          "sol": ["$-6{,}25 : x = 1{,}25$", "$x = -6{,}25 : 1{,}25$", "$x = -5$"]},
    121: {"q": "Riješiti sistem jednačina: $\\begin{cases} x - y = 11 \\\\ x + y = 19 \\end{cases}$",
          "sol": ["$x - y = 11$", "$x + y = 19$", "Sabiranjem: $2x = 30$", "$x = 15$", "$15 - y = 11$", "$y = 4$", "Rješenje sistema je $(15, 4)$."]},
    122: {"q": "Ispitati da li je broj 19 rješenje jednačine: $\\frac{x - 1}{2} - \\frac{x + 5}{3} = 1$",
          "sol": ["$\\frac{x - 1}{2} - \\frac{x + 5}{3} = 1 \\;\\; (\\cdot\\, 6)$", "$3(x - 1) - 2(x + 5) = 6$", "$3x - 3 - 2x - 10 = 6$", "$x = 19$, tj. 19 jeste rješenje jednačine."]},
    123: {"sol": ["$2x - y = 5$", "$x + y = 4$", "Sabiranjem: $3x = 9$", "$x = 3$", "$3 + y = 4$", "$y = 1$", "Rješenje sistema je $(3, 1)$ — JESTE."]},
    124: {"q": "Riješiti jednačinu: $\\frac{y - 1}{2} = 0$",
          "sol": ["$\\frac{y - 1}{2} = 0$", "$y - 1 = 0$", "$y = 1$"]},
    125: {"q": "Riješiti sistem jednačina proizvoljnom metodom: $\\begin{cases} 2x - y = 5 \\\\ x + y = 13 \\end{cases}$",
          "sol": ["$2x - y = 5$", "$x + y = 13$", "Sabiranjem: $3x = 18$", "$x = 6$", "$6 + y = 13$", "$y = 7$", "Rješenje sistema je $(6, 7)$."]},
    126: {"q": "Riješiti sistem jednačina metodom zamjene: $\\begin{cases} 2x + 3y = 4 \\\\ -3x + 2y = 7 \\end{cases}$",
          "sol": ["$2x + 3y = 4$", "$-3x + 2y = 7$", "Iz 1. jednačine: $x = \\frac{4 - 3y}{2}$", "Zamjenom u 2. jednačini: $-3 \\cdot \\frac{4 - 3y}{2} + 2y = 7$", "$-3(4 - 3y) + 4y = 14$", "$-12 + 9y + 4y = 14$", "$13y = 26$", "$y = 2$", "$x = \\frac{4 - 3 \\cdot 2}{2} = -1$", "Rješenje sistema je $(-1, 2)$."]},
    127: {"q": "Riješiti sistem jednačina metodom suprotnih koeficijenata: $\\begin{cases} -2x + 3y = 1 \\\\ 2x + 3y = 5 \\end{cases}$",
          "sol": ["$-2x + 3y = 1$", "$2x + 3y = 5$", "Oduzimanjem 1. od 2. jednačine: $4x = 4$", "$x = 1$", "$2 \\cdot 1 + 3y = 5$", "$3y = 3$", "$y = 1$", "Rješenje sistema je $(1, 1)$."]},
    128: {"q": "Riješiti jednačinu: $\\frac{x - 1}{2} - \\frac{1 - x}{4} = 0$",
          "sol": ["$\\frac{x - 1}{2} - \\frac{1 - x}{4} = 0 \\;\\; (\\cdot\\, 4)$", "$2(x - 1) - (1 - x) = 0$", "$2x - 2 - 1 + x = 0$", "$3x = 3$", "$x = 1$"]},
    129: {"q": "Odredi najveći cijeli broj koji zadovoljava rješenje nejednačine: $3 - \\frac{3}{4}x \\geq 3$",
          "sol": ["$3 - \\frac{3}{4}x \\geq 3 \\;\\; (\\cdot\\, 4)$", "$12 - 3x \\geq 12$", "$-3x \\geq 0$", "$x \\leq 0$", "Najveći cijeli broj koji zadovoljava nejednačinu je 0."]},
    130: {"q": "Riješiti jednačinu: $2 \\cdot \\left(x - \\frac{1}{2}\\right) + 5 = 0$",
          "sol": ["$2\\left(x - \\frac{1}{2}\\right) + 5 = 0$", "$2x - 1 + 5 = 0$", "$2x = -4$", "$x = -2$"]},
    131: {"q": "Riješiti jednačinu: $4(x - 0{,}7) = \\frac{6}{5}$",
          "sol": ["$4(x - 0{,}7) = 1{,}2$", "$4x - 2{,}8 = 1{,}2$", "$4x = 1{,}2 + 2{,}8$", "$4x = 4$", "$x = 1$"]},
    132: {"q": "Koji skup brojeva zadovoljava rješenje nejednačine $2 < x \\leq 4$?",
          "a": "$(2, 3)$", "b": "$(2, 4)$", "c": "$(2, 4]$", "d": "$[2, 3)$"},
    133: {"q": "Adisa je na tržnici za 5 kg jagoda i 2 kg trešanja platila 29 KM. Jagode koštaju 22,5 KM. Koliko košta kilogram trešanja?",
          "sol": ["$5j + 2t = 29$", "$5j = 22{,}5$", "$22{,}5 + 2t = 29$", "$2t = 6{,}5$", "$t = 3{,}25$"]},
    134: {"sol": ["Broj proizvoda — $x$.", "1. dana: $\\frac{3}{5}x$; 2. dana: 50", "$\\frac{3}{5}x + 50 = x \\;\\; (\\cdot\\, 5)$", "$3x + 250 = 5x$", "$2x = 250$", "$x = 125$", "Na policu je poslagano 125 proizvoda."]},
    135: {"q": "Koji broj treba dodati brojniku i nazivniku razlomka $\\frac{1}{7}$ da se dobije broj $\\frac{4}{7}$?",
          "sol": ["$\\frac{1 + x}{7 + x} = \\frac{4}{7}$", "$7(1 + x) = 4(7 + x)$", "$7 + 7x = 28 + 4x$", "$3x = 21$", "$x = 7$", "$\\frac{1 + 7}{7 + 7} = \\frac{8}{14} = \\frac{4}{7}$"]},
    136: {"sol": ["$P = 42\\,\\mathrm{m}^{2}$", "Na $1\\,\\mathrm{m}^{2}$ može se zasaditi 7 karanfila.", "Broj karanfila: $42 \\cdot 7 = 294$", "Na površini od 42 m² može se zasaditi 294 karanfila."]},
    137: {"sol": ["Broj stranica knjige — $x$.", "1. dan: $\\frac{1}{9}x$", "2. dan: $\\frac{3}{4}$ od ostatka, tj. $\\frac{3}{4} \\cdot \\frac{8}{9}x = \\frac{2}{3}x$", "3. dan: preostalih 70 stranica", "$\\frac{1}{9}x + \\frac{2}{3}x + 70 = x \\;\\; (\\cdot\\, 9)$", "$x + 6x + 630 = 9x$", "$2x = 630$", "$x = 315$", "Knjiga ima 315 stranica."]},
    138: {"sol": ["Četvorke — $x$, petice — $y$.", "$x + y = 17 \\;\\; (\\cdot\\, 5)$", "$4x + 5y = 80$", "$5x + 5y = 85$", "Oduzimanjem: $x = 5$", "Iz 1. jednačine: $5 + y = 17$", "$y = 12$", "Učenik je dobio 12 petica."]},
    139: {"sol": ["$T + A = 639$", "$T : A = 4 : 5$", "$4A = 5(639 - A)$", "$4A = 3195 - 5A$", "$9A = 3195$", "$A = 355$ KM", "$T = 639 - 355 = 284$ KM", "Tarik je dobio 284 KM, a Afan 355 KM."]},
    140: {"sol": ["6 dana — 480 kg; 9 dana — $x$ kg", "$6 : 9 = 480 : x$", "$6x = 480 \\cdot 9$", "$6x = 4320$", "$x = 720$ kg", "Slon za 9 dana pojede 720 kg hrane."]},
    141: {"sol": ["Broj učenika — $x$.", "Djevojčice: $\\frac{3}{7}x$; dječaci: $\\frac{4}{7}x$", "$\\frac{3}{7}x + 4 = \\frac{4}{7}x$", "$\\frac{1}{7}x = 4$", "$x = 28$", "U odjeljenju je 28 učenika — 12 djevojčica i 16 dječaka."]},
    142: {"sol": ["Broj loptica — $x$.", "Zelenih: $\\frac{1}{4}x$, plavih: $\\frac{1}{8}x$, žutih: $\\frac{1}{12}x$, bijelih: 26", "$\\frac{1}{4}x + \\frac{1}{8}x + \\frac{1}{12}x + 26 = x \\;\\; (\\cdot\\, 24)$", "$6x + 3x + 2x + 624 = 24x$", "$13x = 624$", "$x = 48$", "Plavih loptica: $\\frac{1}{8} \\cdot 48 = 6$."]},
    143: {"q": "Data je funkcija $f(x) = 3x + 1$. Koliko iznosi vrijednost funkcije u tački $x = 3$?",
          "sol": ["$f(3) = 3 \\cdot 3 + 1 = 10$", "Vrijednost funkcije za $x = 3$ je $y = 10$."]},
    144: {"q": "Zadana je funkcija formulom $f(x) = 2x + 3$. Odredi $f(-2)$!",
          "sol": ["$f(-2) = 2 \\cdot (-2) + 3 = -4 + 3 = -1$", "Vrijednost funkcije za $x = -2$ je $y = -1$."]},
    145: {"q": "Da li je funkcija $f(x) = -\\frac{1}{2}x + 5$ rastuća?",
          "sol": ["$k = -\\frac{1}{2} < 0 \\Rightarrow$ funkcija je opadajuća.", "Funkcija nije rastuća."]},
    146: {"sol": ["$k < 0 \\Rightarrow$ funkcija je opadajuća."]},
    147: {"q": "U kojem kvadrantu se nalazi tačka $A\\left(-\\frac{5}{12}, -3\\right)$?",
          "sol": ["$x < 0$ i $y < 0$", "Tačka $A$ pripada III kvadrantu."]},
    149: {"a": "$y = \\frac{k}{x}$", "b": "$y = \\frac{k}{x} - n$", "c": "$y = kx + n$", "d": "$y = \\frac{k}{x} + n$"},
    151: {"sol": ["$x : 4 = 3 : 2$", "$2x = 4 \\cdot 3$", "$2x = 12$", "$x = 6$"]},
    152: {"sol": ["$18 : 4 = 9 : a$", "$18a = 4 \\cdot 9$", "$18a = 36$", "$a = 2$"]},
    153: {"sol": ["5 kg — 4 KM", "10 kg = $2 \\cdot 5$ kg, pa košta $2 \\cdot 4$ KM", "10 kg krompira košta 8 KM."]},
    155: {"sol": ["5 kg — 7,5 KM; 8 kg — $x$ KM", "$5 : 8 = 7{,}5 : x$", "$5x = 60$", "$x = 12$", "8 kg jabuka košta 12 KM."]},
    156: {"q": "Koliko iznosi nepoznati član proporcije $x : \\frac{3}{5} = 10 : 15$?",
          "sol": ["$15x = 10 \\cdot \\frac{3}{5}$", "$15x = 6$", "$x = \\frac{2}{5}$"]},
    157: {"sol": ["$16 \\cdot 2x = 4 \\cdot 8$", "$32x = 32$", "$x = 1$"]},
    158: {"sol": ["$10 : b = 5 : 7$", "$5b = 10 \\cdot 7$", "$5b = 70$", "$b = 14$"]},
    159: {"correct": "B) (-3, 0)"},
    163: {"q": "U kojim tačkama grafik funkcije $f(x) = 2x - 1$ siječe koordinatne ose?",
          "a": "$A\\left(\\frac{1}{2}, 0\\right)$, $B(0, -1)$", "b": "$A\\left(\\frac{1}{2}, 1\\right)$, $B(1, -1)$",
          "c": "$A(1, 0)$, $B(0, 1)$", "d": "$A(2, 0)$, $B(0, -2)$",
          "sol": ["Za $x$-osu: $y = 0$, pa vrijedi $0 = 2x - 1$", "$x = \\frac{1}{2}$, tj. $A\\left(\\frac{1}{2}, 0\\right)$", "Za $y$-osu: $x = 0$, pa vrijedi $f(0) = -1$", "$B(0, -1)$"]},
    164: {"q": "Odredi nulu funkcije $f(x) = -3x + 2$.",
          "a": "$A\\left(\\frac{1}{2}, 0\\right)$", "b": "$A\\left(\\frac{2}{3}, 0\\right)$", "c": "$A(1, 0)$", "d": "$A(2, 0)$",
          "sol": ["$0 = -3x + 2$", "$3x = 2$", "$x = \\frac{2}{3}$, pa je nula funkcije tačka $N\\left(\\frac{2}{3}, 0\\right)$."]},
    166: {"q": "Da li tačka $A(-2, -1)$ pripada grafiku funkcije $f(x) = \\frac{2}{x}$?",
          "sol": ["Za $A(-2, -1)$: $x = -2$, $y = -1$", "$\\frac{2}{-1} = -2 = y$", "Tačka $A(-2, -1)$ pripada grafiku funkcije."]},
    167: {"correct": "D) N($-3,\\ 0$)",
          "sol": ["$0 = \\frac{1}{3}x + 1$", "$\\frac{1}{3}x = -1$", "$x = -3$, pa je nula funkcije tačka $N(-3, 0)$."]},
    168: {"q": "Odrediti vrijednost funkcije $f(x) = \\frac{2}{3}x + 2$ u tački $x = -3$.",
          "sol": ["$f(-3) = \\frac{2}{3} \\cdot (-3) + 2 = -2 + 2 = 0$"]},
    169: {"q": "Ako je $f(x) = 4x - 5$, izračunaj vrijednost $f\\left(\\frac{5}{4}\\right)$.",
          "sol": ["$f\\left(\\frac{5}{4}\\right) = 4 \\cdot \\frac{5}{4} - 5 = 5 - 5 = 0$"]},
    170: {"q": "Izračunati vrijednost funkcije $f(x) = -x^{3} - x^{2} + x - 1$ ako je $x = -1$.",
          "sol": ["$f(-1) = -(-1)^{3} - (-1)^{2} + (-1) - 1 = 1 - 1 - 1 - 1 = -2$"]},
    171: {"sol": ["12 zidara — 5 dana; 15 zidara — $x$ dana (obrnuta proporcionalnost)", "$12 : 15 = x : 5$", "$15x = 12 \\cdot 5$", "$15x = 60$", "$x = 4$", "Posao bi bio završen za 4 dana."]},
    172: {"sol": ["27 dana — 30 radnika; $x$ dana — 18 radnika (obrnuta proporcionalnost)", "$27 : x = 18 : 30$", "$18x = 27 \\cdot 30$", "$18x = 810$", "$x = 45$", "Isti posao bi bio završen za 45 dana."]},
    173: {"sol": ["$(2 - x) : 3 = 6 : 2$", "$2 \\cdot (2 - x) = 6 \\cdot 3$", "$4 - 2x = 18$", "$-2x = 14$", "$x = -7$"]},
    174: {"sol": ["$16 : (x + 2) = 12 : (2x - 1)$", "$16(2x - 1) = 12(x + 2)$", "$32x - 16 = 12x + 24$", "$20x = 40$", "$x = 2$"]},
    184: {"q": "U funkciji $f(x) = (a - 1)x - (a + 1)$ odredi parametar $a$ tako da funkcija ima nulu za $x_0 = 5$.",
          "sol": ["$0 = (a - 1) \\cdot 5 - (a + 1)$", "$5a - 5 - a - 1 = 0$", "$4a = 6$", "$a = \\frac{6}{4} = \\frac{3}{2}$"]},
    185: {"q": "RAW::Kojoj funkciji odgovara sljedeća tabela:\n\n\\begin{center}\\renewcommand{\\arraystretch}{1.2}\\begin{tabular}{|c|c|c|c|}\n\\hline\n$x$ & $-5$ & $-2$ & $2$ \\\\ \\hline\n$f(x)$ & $6$ & $3$ & $-1$ \\\\ \\hline\n\\end{tabular}\\end{center}",
          "sol": ["$f(x) = kx + n$", "Za $A(-5, 6)$: $6 = -5k + n$; za $B(-2, 3)$: $3 = -2k + n$", "Oduzimanjem: $3 = -3k$", "$k = -1$", "$n = 6 + 5 \\cdot (-1) = 1$", "$f(x) = -x + 1$"]},
    186: {"q": "Odredi vrijednost razlomljene racionalne funkcije $f(x) = \\frac{2x + 1}{x^{2} - 9}$ za $x = -4$.",
          "sol": ["$f(-4) = \\frac{2 \\cdot (-4) + 1}{(-4)^{2} - 9}$", "$f(-4) = \\frac{-8 + 1}{16 - 9} = \\frac{-7}{7} = -1$"]},
    187: {"q": "Odrediti parametar $m$ u funkciji $y = \\left(\\frac{3m}{2} + 1\\right) \\cdot x + 5$ tako da funkcija bude opadajuća.",
          "sol": ["Da bi funkcija bila opadajuća: $k < 0$, tj. $\\frac{3m}{2} + 1 < 0$", "$\\frac{3m}{2} < -1$", "$3m < -2$", "$m < -\\frac{2}{3}$"]},
    188: {"q": "Odredi vrijednost realnog parametra $m$ tako da grafik funkcije $f_1(x) = (m - 1) \\cdot x + 4m$ bude paralelan grafiku $f_2(x) = 10x + 1$, a zatim odredi nulu funkcije $f_1(x)$.",
          "a": "$m = 10$, $x = -5{,}4$", "b": "$m = 12$, $x = -3{,}4$", "c": "$m = 11$, $x = -4{,}4$", "d": "$m = 10$, $x = -2{,}4$",
          "sol": ["Da bi $f_1(x) \\parallel f_2(x)$, mora vrijediti $k_1 = k_2$, tj. $m - 1 = 10$", "$m = 11$", "$f_1(x) = 10x + 44$", "Nula funkcije: $y = 0$", "$10x = -44$", "$x = -4{,}4$"]},
    189: {"sol": ["Dječaka — $x$; djevojčica — 480", "$x : 480 = 7 : 8$", "$8x = 480 \\cdot 7$", "$8x = 3360$", "$x = 420$", "Ukupno: $420 + 480 = 900$ učenika."]},
    190: {"sol": ["45 dana — 15 radnika; 27 dana — $x$ radnika (obrnuta proporcionalnost)", "$45 : 27 = x : 15$", "$27x = 45 \\cdot 15$", "$27x = 675$", "$x = 25$", "Potrebno je 25 radnika."]},
    191: {"sol": ["Katete pravouglog trougla su $a = 1$ i $b = 2$.", "$P = \\frac{a \\cdot b}{2} = \\frac{1 \\cdot 2}{2} = 1$"]},
    192: {"sol": ["Katete pravouglog trougla su $a = 4$ i $b = 4$.", "$P = \\frac{a \\cdot b}{2} = \\frac{16}{2} = 8$"]},
    193: {"sol": ["$C(0, 4)$: $x_1 = 0$, $y_1 = 4$; $E(3, 1)$: $x_2 = 3$, $y_2 = 1$", "$\\overline{CE} = \\sqrt{(x_2 - x_1)^{2} + (y_2 - y_1)^{2}}$", "$\\overline{CE} = \\sqrt{3^{2} + (-3)^{2}} = \\sqrt{18} = \\sqrt{2 \\cdot 9} = 3\\sqrt{2}$"]},
    194: {"sol": ["$C(1, -3)$: $x_1 = 1$, $y_1 = -3$; $E(3, -1)$: $x_2 = 3$, $y_2 = -1$", "$\\overline{CE} = \\sqrt{(3 - 1)^{2} + (-1 + 3)^{2}} = \\sqrt{4 + 4} = \\sqrt{8} = 2\\sqrt{2}$"]},
    195: {"sol": ["Katete pravouglog trougla su $a = 1$ i $b = 2$.", "$c^{2} = a^{2} + b^{2} = 1 + 4 = 5$", "$c = \\sqrt{5}$", "Obim: $O = a + b + c = 1 + 2 + \\sqrt{5} = 3 + \\sqrt{5}$"]},
    212: {"a": "ISPRUŽENI - 180°", "b": "TUPI - 120°", "c": "OŠTRI - 35°", "d": "PRAVI - 90°"},
    213: {"a": "ISPRUŽENI - 180°", "b": "TUPI - 120°", "c": "OŠTRI - 45°", "d": "PRAVI - 90°"},
    229: {"a": "$c^{2} = a^{2} + b^{2}$", "b": "$c^{2} = a^{2} - b^{2}$", "c": "$c^{2} = a^{2} = b^{2}$", "d": "$c^{2} = a^{2} + 2b^{2}$"},
    230: {"correct": "D) HIPOTENUZA"},
    231: {"a": "$c^{2} = a^{2} + b^{2}$ — kvadrat nad hipotenuzom jednak je zbiru kvadrata nad katetama",
          "b": "$c^{2} = a^{2} - b^{2}$ — kvadrat nad hipotenuzom jednak je razlici kvadrata nad katetama",
          "c": "$c^{2} = a^{2} = b^{2}$ — kvadrat nad hipotenuzom jednak kvadratima nad katetama",
          "d": "$c^{2} = a^{2} + 2b^{2}$ — kvadrat nad hipotenuzom jednak je zbiru kvadrata nad katetom $a$ i dvostrukim kvadratom nad $b$"},
    232: {"a": "$P = a^{2} + b^{2}$", "b": "$P = a^{2} - b^{2}$", "c": "$P = a^{2} = b^{2}$", "d": "$P = a^{2}$"},
    233: {"a": "$P = \\frac{3ah}{2}$", "b": "$P = \\frac{a : h}{2}$", "c": "$P = \\frac{ah}{2}$", "d": "$P = \\frac{a}{2}$"},
    240: {"a": "UNUTRAŠNJI: $\\alpha$, $\\beta$; VANJSKI: $\\alpha'$, $\\beta'$, $\\gamma$, $\\gamma'$",
          "b": "UNUTRAŠNJI: $\\alpha$, $\\beta$, $\\gamma$, $\\gamma'$; VANJSKI: $\\alpha'$, $\\beta'$",
          "c": "UNUTRAŠNJI: $\\alpha'$, $\\beta'$, $\\gamma'$; VANJSKI: $\\alpha$, $\\beta$, $\\gamma$",
          "d": "UNUTRAŠNJI: $\\alpha$, $\\beta$, $\\gamma$; VANJSKI: $\\alpha'$, $\\beta'$, $\\gamma'$"},
    242: {"q": "Koliko iznosi obim trougla na slici:\n\n@@IMG:image62.png:1.08:0.85@@",
          "sol": ["$O = a + a + a$", "$O = 3a$", "$O = 3 \\cdot 4\\,\\mathrm{cm} = 12\\,\\mathrm{cm}$"]},
    243: {"a": "$O = 2(a + b)$, $P = a \\cdot b$", "b": "$O = 2a - 2b$, $P = a \\cdot b$",
          "c": "$O = 2a : 2b$, $P = a \\cdot b$", "d": "$O = 2a \\cdot 2b$, $P = a \\cdot b$"},
    247: {"q": "Koliko m³ vode je potrebno da se napuni olimpijski bazen čije su dimenzije $50\\,\\mathrm{m} \\times 25\\,\\mathrm{m} \\times 2\\,\\mathrm{m}$?\n\n@@IMG:image67.png:1.80:0.69@@",
          "sol": ["$V = a \\cdot b \\cdot c$", "$V = 50 \\cdot 25 \\cdot 2$", "$V = 2500\\,\\mathrm{m}^{3}$"]},
    249: {"sol": ["$d^{2} = a^{2} + b^{2}$", "$d^{2} = 36 + 64 = 100$", "$d = \\sqrt{100} = 10\\,\\mathrm{cm}$"]},
    250: {"sol": ["$d^{2} = a^{2} + a^{2} = 2a^{2}$", "$a^{2} = \\frac{d^{2}}{2} = \\frac{100}{2} = 50$", "$a = \\sqrt{50} = \\sqrt{2 \\cdot 25} = 5\\sqrt{2}\\,\\mathrm{cm}$"]},
    251: {"sol": ["Odmotana kružnica daje duž jednaku obimu kružnice poluprečnika 5 cm.", "$O = 2 \\cdot r \\cdot \\pi$", "$O = 2 \\cdot 5\\,\\mathrm{cm} \\cdot 3{,}14$", "$O = 31{,}4\\,\\mathrm{cm}$"]},
    252: {"sol": ["Tetiva $\\overline{AB} = 2r = 2 \\cdot 2{,}5\\,\\mathrm{cm} = 5\\,\\mathrm{cm}$."]},
    254: {"sol": ["$A(1, 1)$: $x_1 = 1$, $y_1 = 1$; $B(13, 6)$: $x_2 = 13$, $y_2 = 6$", "$\\overline{AB} = \\sqrt{(13 - 1)^{2} + (6 - 1)^{2}} = \\sqrt{144 + 25} = \\sqrt{169} = 13$", "Iz pravouglog trougla: $a = 12$, $b = 5$, pa je $c = \\sqrt{12^{2} + 5^{2}} = 13\\,\\mathrm{cm}$."]},
    255: {"sol": ["Simetrala dijeli ugao na dva jednaka dijela.", "$2 \\cdot 31^{\\circ}14' = 62^{\\circ}28'$", "Veličina ugla $MVN$ iznosi $62^{\\circ}28'$."]},
    258: {"q": "Na slici je kvadar $ABCDEFGH$. Dužine stranica su $EA = EH = 2\\,\\mathrm{cm}$ i $EF = 10\\,\\mathrm{cm}$. Koja je površina ovog kvadra?\n\n@@IMG:image78.png:1.49:0.80@@",
          "sol": ["$P = 2(ab + ac + bc)$", "$P = 2(2 \\cdot 10 + 2 \\cdot 2 + 10 \\cdot 2)\\,\\mathrm{cm}^{2}$", "$P = 2(20 + 4 + 20)\\,\\mathrm{cm}^{2}$", "$P = 88\\,\\mathrm{cm}^{2}$"]},
    259: {"sol": ["$P = 2(ab + ac + bc)$", "$P = 2(8 \\cdot 2 + 8 \\cdot 3 + 2 \\cdot 3)\\,\\mathrm{cm}^{2}$", "$P = 2(16 + 24 + 6)\\,\\mathrm{cm}^{2}$", "$P = 92\\,\\mathrm{cm}^{2}$"]},
    260: {"sol": ["$P = 6a^{2}$", "$P = 6 \\cdot 5^{2}\\,\\mathrm{cm}^{2}$", "$P = 150\\,\\mathrm{cm}^{2}$"]},
    261: {"q": "Koliko iznosi zapremina kocke stranice dužine 10 cm?\n\n@@IMG:image81.png:1.16:1.11@@",
          "a": "1000 cm³", "b": "100 cm³", "c": "1500 cm³", "d": "500 cm³",
          "sol": ["$V = a^{3}$", "$V = 10^{3}\\,\\mathrm{cm}^{3}$", "$V = 1000\\,\\mathrm{cm}^{3}$"]},
    266: {"sol": ["$O = 2 \\cdot r \\cdot \\pi$", "$O = 2 \\cdot 5\\,\\mathrm{cm} \\cdot 3{,}14$", "$O = 31{,}4\\,\\mathrm{cm}$"]},
    267: {"sol": ["$P = r^{2} \\cdot \\pi$", "$P = 10^{2} \\cdot 3{,}14\\,\\mathrm{cm}^{2}$", "$P = 314\\,\\mathrm{cm}^{2}$"]},
    268: {"sol": ["$a = 2\\,\\mathrm{cm}$, $b = 4\\,\\mathrm{cm}$", "$O = a + 2b$", "$O = 2 + 2 \\cdot 4$", "$O = 10\\,\\mathrm{cm}$"]},
}

SECTIONS = [
    (1, 13, "Brojevi i razlomci"),
    (14, 45, "Djeljivost brojeva, prosti faktori, NZS i NZD"),
    (46, 94, "Računske operacije, stepeni i algebraički izrazi"),
    (95, 132, "Jednačine i nejednačine"),
    (133, 142, "Tekstualni zadaci"),
    (143, 191, "Linearna funkcija i proporcionalnost"),
    (192, 268, "Geometrija"),
]

def section_of(no):
    for a, b, name in SECTIONS:
        if a <= no <= b:
            return name
    return "Ostalo"

def parse_correct_letter(correct, options):
    """Return (letter, text) of correct option, matching by letter or text."""
    m = re.search(r"([A-D])", correct)
    letter = m.group(1) if m else None
    text = correct
    text = re.sub(r"^[A-D]\)\s*", "", text).strip()
    text = re.sub(r"^\$?\$?", "", text).strip().rstrip("$").strip()
    return letter, text

def main():
    with open(RAW, encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} raw records", file=sys.stderr)

    # 1. auto-clean every field
    for r in data:
        for k in ("question", "a", "b", "c", "d", "correct", "solution"):
            parts = r[k].split("@@P@@") if k == "solution" else [r[k]]
            parts = [auto_clean(p) for p in parts if p.strip()]
            # dedupe consecutive identical paragraphs in solutions
            if k == "solution":
                ded = []
                for p in parts:
                    if not ded or ded[-1] != p:
                        ded.append(p)
                parts = ded
            r[k] = "@@P@@".join(parts)
        # strip leading letter labels from options (re-lettered later)
        for k in ("a", "b", "c", "d"):
            r[k] = re.sub(r"^[A-DА-Д]\)\s*", "", r[k]).strip()

    # 2. apply overrides
    for r in data:
        no = int(r["no"])
        if no in OV:
            o = OV[no]
            for k, v in o.items():
                if isinstance(v, list):
                    v = "@@P@@".join(auto_clean(x) for x in v)
                elif isinstance(v, str) and not v.startswith("RAW::"):
                    v = auto_clean(v)
                if k == "sol":
                    r["solution"] = v
                elif k == "q":
                    r["question"] = v
                else:
                    r[k] = v

    # 2.5 join soft-wrap paragraph breaks in questions (lowercase->lowercase = wrap artifact)
    for r in data:
        q = r["question"]
        q = re.sub(r"(?<=[a-zčćšžđ])@@P@@(?=[a-zčćšžđ])", " ", q)
        r["question"] = q

    # 3. drop duplicate #16 (identical to #15)
    q15 = next(r for r in data if r["no"] == "15")
    q16 = next(r for r in data if r["no"] == "16")
    assert q15["question"] == q16["question"] and q15["a"] == q16["a"], "15/16 not identical!"
    data = [r for r in data if r["no"] != "16"]
    print(f"Dropped duplicate #16 -> {len(data)} questions", file=sys.stderr)

    # 4. reorder: question text first, then images (for questions where image came first)
    for r in data:
        q = r["question"]
        imgs = re.findall(r"@@IMG:[^@]+@@", q)
        if imgs and q.startswith("@@IMG:"):
            text = re.sub(r"@@IMG:[^@]+@@", "", q).strip()
            r["question"] = (text + " " if text else "") + "".join(imgs)

    # 5. missing-image note for questions referencing "slic" without image anywhere
    for r in data:
        has_img = "@@IMG:" in r["question"] or any("@@IMG:" in r[k] for k in ("a", "b", "c", "d"))
        if re.search(r"\bslic[aiue]\b|\bna slik", r["question"], re.I) and not has_img:
            r["question"] += " (slika nije bila u originalnom dokumentu)"

    # 6. re-letter options, drop empties, remap correct
    fixed = []
    for r in data:
        opts = [r["a"], r["b"], r["c"], r["d"]]
        letters = ["A", "B", "C", "D"]
        correct = r["correct"]
        # letter of correct as stored
        cm = re.search(r"([A-D])", correct)
        c_letter = cm.group(1) if cm else None
        c_text = re.sub(r"^[A-D]\)\s*", "", correct).strip()
        # normalize correct text: remove latex math wrappers for comparison
        def norm(s):
            s = re.sub(r"\$", "", s)
            s = re.sub(r"\\[a-zA-Z]+", " ", s)
            s = re.sub(r"[{}\\\s]", "", s)
            return s.lower()
        # find matching option by letter first, then by text
        c_idx = None
        if c_letter:
            orig_idx = "ABCD".index(c_letter)
            if orig_idx < len(opts) and opts[orig_idx]:
                c_idx = orig_idx
            else:
                # letter out of range or empty: fall back to text match
                c_idx = None
        if c_idx is None and c_text:
            for i, o in enumerate(opts):
                if o and (norm(o) == norm(c_text) or norm(c_text) in norm(o) or norm(o) in norm(c_text)):
                    c_idx = i
                    break
        if c_idx is None:
            print(f"WARN #{r['no']}: correct answer not resolved ({correct!r})", file=sys.stderr)
            c_idx = 0 if opts[0] else None
        # clean option list = non-empty
        kept = [(i, o) for i, o in enumerate(opts) if o]
        new_letters = "ABCD"[: len(kept)]
        new_correct = None
        for new_l, (i, o) in zip(new_letters, kept):
            if i == c_idx:
                new_correct = new_l
        rec = {
            "no": r["no"],
            "question": r["question"],
            "options": [{"label": l, "text": o} for l, (i, o) in zip(new_letters, kept)],
            "correct_letter": new_correct,
            "solution": r["solution"],
        }
        fixed.append(rec)
    print(f"Fixed options for {len(fixed)} questions", file=sys.stderr)

    # 7. sections + sequential ids
    out = []
    for seq, r in enumerate(fixed, start=1):
        out.append({
            "id": seq,
            "original_no": int(r["no"]),
            "topic": section_of(int(r["no"])),
            "question": r["question"],
            "options": r["options"],
            "correct_letter": r["correct_letter"],
            "solution": [p for p in r["solution"].split("@@P@@") if p.strip()],
        })

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"Wrote {OUT}: {len(out)} questions", file=sys.stderr)

    # report option-count changes and unresolved warnings
    two_opt = [r["original_no"] for r in out if len(r["options"]) == 2]
    three_opt = [r["original_no"] for r in out if len(r["options"]) == 3]
    print(f"2-option questions (originals): {two_opt}", file=sys.stderr)
    print(f"3-option questions (originals): {three_opt}", file=sys.stderr)

if __name__ == "__main__":
    main()
