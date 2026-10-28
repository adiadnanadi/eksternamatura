#!/usr/bin/env python3
"""Build data/srednja-matematika.json from quiz_raw.json (srednja škola matematika).

Isti koncept kao osnovna banka: sve formule u LaTeX ($...$), rješenja po paragrafima,
slike u public/quiz-media/ (prefiks 'srednja-'), opcije [{label,text,image}].
"""
import json
import os
import re
import shutil
import unicodedata

SRC = "/home/z/my-project/work/quiz-srednja/quiz_raw.json"
MEDIA_SRC = "/home/z/my-project/work/quiz-srednja/media"
MEDIA_DST = "/home/z/my-project/public/quiz-media"
OUT = "/home/z/my-project/data/srednja-matematika.json"

DROPS = {101, 153}  # tačni duplikati (101=98; 153=151 isti tekst i isti tačan odgovor)

# ---------------------------------------------------------------- čišćenje

GREEK = {
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'varepsilon',
    'θ': 'theta', 'λ': 'lambda', 'μ': 'mu', 'π': 'pi', 'ρ': 'rho',
    'σ': 'sigma', 'τ': 'tau', 'φ': 'varphi', 'ω': 'omega',
}


GREEK_NAMES = {
    'ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'THETA', 'IOTA',
    'KAPPA', 'LAMBDA', 'MU', 'NU', 'XI', 'OMICRON', 'PI', 'RHO', 'SIGMA', 'TAU',
    'UPSILON', 'PHI', 'CHI', 'PSI', 'OMEGA',
}


def de_italic(s: str) -> str:
    """Math-italic unicode → ASCII; grčka slova (PI) u $...$ stil."""
    out = []
    for ch in s:
        cp = ord(ch)
        if 0x1D400 <= cp <= 0x1D7FF:
            try:
                name = unicodedata.name(ch)
            except ValueError:
                out.append(ch)
                continue
            parts = name.split()
            if parts[-1] in GREEK_NAMES:
                out.append(f"$\\{GREEK.get(parts[-1].lower(), parts[-1].lower())}$")
            elif 'MATHEMATICAL' in parts:
                letter = None
                for i, tok in enumerate(parts):
                    if tok in ('SMALL', 'CAPITAL') and i + 1 < len(parts):
                        letter = parts[i + 1].lower()
                out.append(letter or '')
            else:
                out.append(ch)
        elif ch == 'π':
            out.append('$\\pi$')
        else:
            out.append(ch)
    return ''.join(out)


def strip_artifacts(s: str) -> str:
    s = s.replace('`<!-- -->`{=html}', '').replace('{=html}', '')
    s = re.sub(r'\[([^\]]+)\]\{\.underline\}', r'\1', s)
    s = re.sub(r'(?:^|\s)>\s+', lambda m: ' ' if m.start() > 0 else '', s)
    s = re.sub(r'^\s*>\s*', '', s)
    s = s.replace("\\'", "'")  # pandoc escape apostrofa (y\' → y')
    s = re.sub(r'^\\+|\\+$', '', s.strip())  # samoća backslash na rubovima
    s = s.replace('\\ ', ' ')  # backslash-space (LaTeX thin space) → običan razmak
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def convert_grid_table(s: str) -> str:
    """Pandoc grid tabela (viselinijska ili spojena u jedan red) -> 'x: a, b; F(x): c, d'."""
    segs = re.split(r'\+[-=]+\+', s)
    rows = []
    for seg in segs:
        seg = seg.strip()
        if not seg or re.fullmatch(r'[-=\s]*', seg):
            continue
        cells = [c.strip() for c in seg.strip('|').split('|')]
        cells = [re.sub(r'^>\s*', '', c) for c in cells]
        if cells and any(cells):
            rows.append(cells)
    if not rows:
        return s
    parts = []
    for r in rows:
        label, vals = r[0], r[1:]
        if label and vals:
            parts.append(f"{label}: {', '.join(vals)}")
        else:
            parts.append(', '.join(r))
    return ' ; '.join(parts)


def clean_cell(s: str, in_table_ctx: bool = False) -> str:
    if '+---' in s or '+===' in s:
        s = convert_grid_table(s)
    s = s.replace('@@P@@', ' ')
    s = strip_artifacts(s)
    s = de_italic(s)
    # unicode minus / različiti crtice
    s = s.replace('\u2212', '-').replace('\u2013', '-').replace('\u2014', '-')
    # display math → inline
    s = s.replace('$$', '$')
    SUPS = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'}
    def sup_repl(m):
        return f"${m.group(1)}^{{{''.join(SUPS[c] for c in m.group(2))}}}$"
    s = re.sub(r'([A-Za-z0-9\)])\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+)', sup_repl, s)
    # pandoc superscripts/subscripts
    s = re.sub(r'(\d)\^0\^', r'$\1^{0}$', s)          # 1^0^ → nulti stepen (180° ide preko override-a)
    s = re.sub(r'\^(\d+)\^\s*√\s*(\w+)', r'$\\sqrt[\1]{\2}$', s)  # ^12^√8
    def sup_conv(m):
        exp = re.sub(r'\s+', '', m.group(2))
        return f"${m.group(1)}^{{{exp}}}$"
    s = re.sub(r'([A-Za-z0-9\)]+)\s*\^(?!\{)([^\^$]{1,16}?)\^', sup_conv, s)  # 3^4^, y^- 2^, cm^2^
    s = re.sub(r'~([^~$]{1,12}?)~', lambda m: '$_{' + re.sub(r"\s+", "", m.group(1)) + '}$', s)  # x~1~
    # √ u tekstu
    s = re.sub(r'√\s*\{?\}?(\w+)', r'$\\sqrt{\1}$', s)
    # ∙ bullet → \cdot
    s = s.replace('∙', '$\\cdot$').replace('⋅', '$\\cdot$').replace('\\bullet', '\\cdot')
    # relacijski znakovi u tekstu → math
    s = s.replace('∈', '$\\in$').replace('≤', '$\\leq$').replace('≥', '$\\geq$')
    s = s.replace('≠', '$\\neq$').replace('∞', '$\\infty$')
    # broken sqrt: $\sqrt{}$2 → $\sqrt{2}$
    s = re.sub(r'\$\\sqrt\{\}\$(\d+)', r'$\\sqrt{\1}$', s)
    # math poliranje (unutar $...$)
    def fix_math(m):
        t = m.group(1)
        t = re.sub(r'(\d),(\d)', r'\1{,}\2', t)                       # decimal zarez
        t = re.sub(r"(\d)\^\{''\}", r"\1''", t)                     # sekunde
        t = re.sub(r"(\d)\^\{'\}", r"\1'", t)                       # minute
        t = re.sub(r'(\d)\^\{0\}', r'\1^{\\circ}', t)               # 155^{0} → ugao (nulti stepen: Q22/Q23 override)
        t = re.sub(r'\\frac\{([^{}]*?)\s*\\cdot\s*\}\{([^{}]*)\}', r'\\frac{\1}{\2} \\cdot ', t)
        t = re.sub(r'\\bullet', '\\\\cdot', t)
        # čisti tekst u math (npr. $\ suplementni$) → van math-a
        t2 = t.replace('\\\\', '\\')
        if not re.search(r'[\\=<>0-9+\-*/^_{}().,]', t2) and re.search(r'[A-Za-zšđčćžŠĐČĆŽ]', t2):
            return ' ' + t2 + ' '
        return '$' + t + '$'
    s = re.sub(r'\$([^$\n]+)\$', fix_math, s)
    # "cm^2^" tip nakon konverzije ostaje čist — cm2 unutar math je ok (cm^{2})
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'\s+([,.;:!?])', r'\1', s)
    return s


# ---------------------------------------------------------------- markers

IMG_M = re.compile(r'@@IMG:(image\d+\.\w+):[\d.]+:[\d.]+@@')


def extract_images(s: str):
    imgs = IMG_M.findall(s)
    return IMG_M.sub('', s), imgs



# ---------------------------------------------------------------- ručne korekcije (po izvornom broju)

OV = {
    20: {'solution': ['$3^{4} \\cdot 3^{10} = 3^{4 + 10} = 3^{14}$']},
    22: {'question': 'Izračunaj vrijednost izraza: $1^{0} + 2^{0} + 3^{0} + 4^{0}$.'},
    208: {'solution': ['$y = 3x^{2} - x - 2$', "$y' = (3x^{2} - x - 2)' = 6x - 1$",
                     '$6x - 1 = 0$', '$x = \\frac{1}{6}$',
                     '$y = 3\\left(\\frac{1}{6}\\right)^{2} - \\frac{1}{6} - 2 = \\frac{1}{12} - \\frac{2}{12} - \\frac{24}{12} = -\\frac{25}{12}$',
                     'T$_{\\min}\\left(\\frac{1}{6}, -\\frac{25}{12}\\right)$ — funkcija ima minimum u toj tački.']},
    23: {'question': 'Izračunati vrijednost izraza: $3^{0} + 3^{1} + 3^{2} + 3^{3}$.',
         'solution': ['$3^{0} + 3^{1} + 3^{2} + 3^{3} = 1 + 3 + 9 + 27 = 40$']},
    88: {
        'options': [
            'x: -1, 0, 1 ; F(x): 2, 4, 6',
            'x: -1, 0, 1 ; F(x): 3, 2, 1',
            'x: -1, 0, 1 ; F(x): 1, 2, 3',
            'x: -1, 0, 1 ; F(x): 4, 6, 8',
        ],
        'correct_letter': 'A',
        'correct_index': 0,
        'solution': ['x: -1, 0, 1 ; F(x): 2, 4, 6',
                     'Prava $f(x) = 2x + 4$ siječe y-osu u tački (0, 4) — tabeli odgovara grafik funkcije.'],
    },
    89: {'solution': ['x: 0, 1, 2, 3 ; F(x): 1, 3, 5, 7',
                      '$0 \\cdot k + n = 1$', '$1 \\cdot k + n = 3$ (oduzimanjem: 2. minus 1.)',
                      '$k = 2$', '$n = 1$', '$f(x) = 2x + 1$']},
    139: {'solution': ['sada / prije 4 g / nakon 4 g — Otac: x, x-4, x+4 ; Sin: y, y-4, y+4',
                       '$(x-4) = 7(y-4)$ ; $(x+4) = 3(y+4)$',
                       'Rješavanjem sistema: $x = 32$, $y = 8$',
                       'Otac ima 32 a sin 8 godina.',
                       'Provjera: prije 4 g — otac 28, sin 4 — $4 \\cdot 7 = 28$; nakon 4 g — otac 36, sin 12 — $3 \\cdot 12 = 36$.']},
    221: {
        'question': 'Popuni tabelu za $f(x) = 3^{-x}$: x: -2, 0, $\\frac{1}{2}$, 1.',
        'options': [
            'x: -2, 0, $\\frac{1}{2}$, 1 ; F(x): 7, 1, $\\frac{\\sqrt{3}}{3}$, $\\frac{1}{3}$',
            'x: -2, 0, $\\frac{1}{2}$, 1 ; F(x): 9, 1, $\\frac{\\sqrt{3}}{3}$, $\\frac{1}{3}$',
            'x: -2, 0, $\\frac{1}{2}$, 1 ; F(x): 9, 1, $\\frac{\\sqrt{3}}{2}$, $\\frac{1}{3}$',
            'x: -2, 0, $\\frac{1}{2}$, 1 ; F(x): 9, 3, $\\frac{\\sqrt{3}}{3}$, $\\frac{1}{3}$',
        ],
        'correct_letter': 'B',
        'correct_index': 1,
        'solution': ['x: -2, 0, $\\frac{1}{2}$, 1 ; F(x): 9, 1, $\\frac{\\sqrt{3}}{3}$, $\\frac{1}{3}$',
                     '$f(-2) = 3^{2} = 9$', '$f(0) = 3^{0} = 1$',
                     '$f\\left(\\frac{1}{2}\\right) = 3^{-\\frac{1}{2}} = \\frac{1}{\\sqrt{3}} = \\frac{\\sqrt{3}}{3}$',
                     '$f(1) = 3^{-1} = \\frac{1}{3}$'],
    },
    222: {'solution': ['x: -1, 0, 1 ; F(x): $\\frac{1}{2}$, 1, 2 (za $f(x) = 2^{x}$)',
                       'Eksponencijalna funkcija $2^{x}$ raste i prolazi kroz tačku (0, 1) — grafik pod B.']},
    225: {'solution': ['x: -1, 0, 1 ; F(x): 1, 3, 9 (za $f(x) = 3^{x+1}$)',
                       '$f(x) = 3^{x + 1}$',
                       'Samo grafik pod D siječe y-osu u tački (0, 3) i prolazi kroz ostale tačke iz gornje tabele.']},
    226: {'solution': ['x: -1, 0, 1 ; F(x): $\\frac{1}{3}$, 1, 3 (za $f(x) = 3^{x}$)',
                       '$f(x) = 3^{x}$',
                       'Samo grafik pod A siječe y-osu u tački (0, 1) i prolazi kroz ostale tačke iz gornje tabele.']},
    284: {'question': 'Dva ugla čiji zbir iznosi 180° zovu se:'},
}

def apply_ov(no: int, q: dict):
    ov = OV.get(no)
    if not ov:
        return
    if 'options' in ov:
        q['options'] = [{'label': 'ABCD'[i], 'text': t, 'image': None} for i, t in enumerate(ov['options'])]
    for f in ('question', 'solution'):
        if f in ov:
            q[f] = ov[f] if isinstance(ov[f], list) else ov[f]
    if 'correct_letter' in ov:
        q['correct_letter'] = ov['correct_letter']
    if 'correct_index' in ov:
        q['correct_index'] = ov['correct_index']

# ---------------------------------------------------------------- glavno

TOPICS = [
    (15, 'Brojevi, apsolutna vrijednost i intervali'),
    (28, 'Računske operacije i stepeni'),
    (59, 'Polinomi i algebarski izrazi'),
    (78, 'Proporcije i procentni račun'),
    (92, 'Linearne funkcije'),
    (128, 'Jednačine i nejednačine'),
    (140, 'Sistemi jednačina'),
    (159, 'Korijeni'),
    (175, 'Kompleksni brojevi'),
    (212, 'Kvadratna funkcija i jednačine'),
    (237, 'Eksponencijalne funkcije'),
    (280, 'Logaritamske funkcije'),
    (304, 'Geometrija'),
    (10**9, 'Trigonometrija'),
]


def topic_for(no: int) -> str:
    if no == 141:  # omjer Tarik/Adnan → proporcije
        return 'Proporcije i procentni račun'
    for upto, name in TOPICS:
        if no <= upto:
            return name
    return 'Ostalo'


def math_level(idx: int, total: int) -> str:
    if idx <= round(total * 0.4):
        return 'OSNOVNI'
    if idx <= round(total * 0.8):
        return 'SREDNJI'
    return 'VISI'


def norm_opt(text: str, image) -> str:
    return re.sub(r'\s+', ' ', text or '').strip() + '|' + (image or '')


def main():
    raw = json.load(open(SRC, encoding='utf-8'))
    by_no = {}
    for r in raw:
        if r['no'].isdigit():
            by_no[int(r['no'])] = r

    report = []
    questions = []
    new_id = 0
    for no in sorted(by_no):
        if no in DROPS:
            report.append(f'Q{no}: UKLONJEN kao duplikat')
            continue
        r = by_no[no]

        q_text_raw, q_imgs_raw = extract_images(r['question'])
        sol_raw, sol_imgs_raw = extract_images(r['solution'])

        q_text = clean_cell(q_text_raw)
        q_imgs = ['media/srednja-' + i for i in q_imgs_raw]

        # opcije: (čisti tekst, slika)
        def drop_solo_label(cell_raw: str) -> str:
            parts = cell_raw.split('@@P@@')
            if len(parts) > 1 and re.fullmatch(r'\s*[A-E]\)?\s*', parts[0] or ''):
                return '@@P@@'.join(parts[1:])
            return cell_raw

        opt_cells = []
        for k in 'abcd':
            o_raw, o_imgs = extract_images(drop_solo_label(r[k]))
            txt = clean_cell(o_raw)
            txt = re.sub(r'^[A-E]\)\s*', '', txt).strip()
            img = ('media/srednja-' + o_imgs[0]) if o_imgs else None
            opt_cells.append({'text': txt, 'image': img})

        # labela unutar ćelije (za label-priority mapping)
        labels = []
        for k in 'abcd':
            m = re.match(r'^\s*([A-E])\)', r[k].strip())
            labels.append(m.group(1) if m else None)

        # tačan odgovor → letter
        corr_clean = clean_cell(r['correct'])
        corr_clean = re.sub(r'^[A-E]\)\s*', '', corr_clean).strip()
        m = re.match(r'^([A-E])[\)\.\s]', r['correct'].strip()) or re.search(r'(?<![A-Za-z])([A-E])\)', r['correct'].strip())
        letter = m.group(1) if m else None

        # mapping: label-priority ako su sve labele kanonski A-D
        content_by_label = None
        if all(labels) and sorted(labels) == ['A', 'B', 'C', 'D']:
            content_by_label = dict(zip(labels, opt_cells))

        chosen = None
        if letter and content_by_label and letter in content_by_label:
            chosen = content_by_label[letter]
            if chosen is not opt_cells['ABCD'.index(letter)]:
                report.append(f'Q{no}: label-mapping (correct {letter}) → sadržaj po labeli')
        elif letter:
            chosen = opt_cells['ABCD'.index(letter)]

        # prazne opcije (bez teksta i bez slike) → odbaci
        opts = [o for o in opt_cells if (o['text'] or o['image'])]
        dropped = len(opt_cells) - len(opts)
        if dropped:
            report.append(f'Q{no}: odbačeno {dropped} praznih opcija')

        correct_index = None
        if letter:
            key = norm_opt(chosen['text'], chosen['image']) if chosen else None
            for i, o in enumerate(opts):
                if norm_opt(o['text'], o['image']) == key:
                    correct_index = i
                    break
            if correct_index is None:
                report.append(f'Q{no}: ⚠ tačan {letter} NIJE pronađen među opcijama!')
        else:
            # fallback: correct cell content == jedna od opcija (Q88/Q221 tip)
            for i, o in enumerate(opts):
                if norm_opt(o['text'], o['image']) == norm_opt(corr_clean, ''):
                    correct_index = i
                    break
            if correct_index is None:
                report.append(f'Q{no}: ⚠ NEPARSIRAN tačan odgovor: {corr_clean[:50]!r}')

        # rješenje: paragrafi + slike
        sol_paras = []
        for p in sol_raw.split('@@P@@'):
            p = clean_cell(p)
            if p and p not in ('-', ';', ':'):
                sol_paras.append(p)
        sol_paras = [p for p in sol_paras if p.strip()]
        sol_imgs = ['media/srednja-' + i for i in sol_imgs_raw]

        # korekcije teksta: "cm2" u običnom tekstu → math
        q_text = re.sub(r'(?<![\$\\w])(cm|km|kg|m)\^?2\^?(?![\w}])', r'$\1^{2}$', q_text)

        new_id += 1
        questions.append({
            'id': new_id,
            'original_no': no,
            'topic': topic_for(no),
            'question': q_text,
            'images': q_imgs,
            'options': [{'label': 'ABCD'[i], 'text': o['text'], 'image': o['image']} for i, o in enumerate(opts)],
            'correct_letter': 'ABCD'[correct_index] if correct_index is not None else '?',
            'correct_index': correct_index,
            'solution': sol_paras,
            'solution_images': sol_imgs,
            '_level_hint': math_level(new_id, 315 - len(DROPS)),
        })
        apply_ov(no, questions[-1])

    # validacija
    n = len(questions)
    from collections import Counter
    dist = Counter(q['correct_letter'] for q in questions)
    nopts = Counter(len(q['options']) for q in questions)
    no_sol = [q['original_no'] for q in questions if not q['solution'] and not q['solution_images']]
    print(f"Pitanja: {n}")
    print(f"Tačan odgovor raspodjela: {dict(dist)}")
    print(f"Broj opcija raspodjela: {dict(nopts)}")
    print(f"Bez rješenja: {len(no_sol)}")
    print(f"Nivoi: {dict(Counter(q['_level_hint'] for q in questions))}")
    print(f"Teme: {dict(Counter(q['topic'] for q in questions))}")
    print("\n--- IZVJEŠTAJ ---")
    for line in report:
        print(" ", line)

    for q in questions:
        q['level'] = q.pop('_level_hint')
        if q['original_no'] == 304:
            for f in ('question',):
                q[f] = q[f].replace('^{0}', '^{\\irc}')
            for o in q['options']:
                o['text'] = o['text'].replace('^{0}', '^{\\circ}')
            q['solution'] = [p.replace('^{0}', '^{\\circ}') for p in q['solution']]

    meta = {
        'title': 'Matematika (srednja škola) — banka pitanja za kviz',
        'count': n,
        'language': 'bs',
        'math_format': 'LaTeX (render with KaTeX or MathJax)',
        'note': "Izvor: Word dokument 'rjesenja tabela-MM- srednja'. Tačni duplikati "
                '(izvorno 101=98 i 153=151) uklonjeni; opcije re-letterisane po poziciji.',
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'meta': meta, 'questions': questions}, f, ensure_ascii=False, indent=1)
    print(f"\nWrote {OUT} ({n} pitanja)")

    # slike
    os.makedirs(MEDIA_DST, exist_ok=True)
    copied = 0
    for fn in os.listdir(MEDIA_SRC):
        if re.match(r'^image\d+\.\w+$', fn):
            shutil.copy2(os.path.join(MEDIA_SRC, fn), os.path.join(MEDIA_DST, 'srednja-' + fn))
            copied += 1
    print(f"Kopirano slika: {copied}")


if __name__ == '__main__':
    main()
