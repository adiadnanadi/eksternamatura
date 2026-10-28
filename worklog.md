# Worklog

---
Task ID: 1
Agent: main (Z.ai)
Task: Prebaciti Word dokument "rjesenja tabela-MM (1).docx" (268 kviz pitanja iz matematike) u LaTeX + PDF, plus JSON za kviz web aplikaciju.

Work Log:
- Učitan pdf skill; Academic ruta (LaTeX/Tectonic); pročitani briefs/academic.md, configs/fonts.md, typesetting/cover.md (Template 04), typesetting/overflow.md
- AskUserQuestion: korisnik izabrao kviz format, vraćanje formula iz originala, slike uz pitanja, rješenja uz svako pitanje, ispravke grešaka, JSON + PDF, naslovna + podjele, zeleni tačni odgovori
- Ekstrakcija: pandoc → grid tabela (poziciono parsiranje, scripts/parse_quiz.py), OMML formule → LaTeX, --extract-media (87 slika)
- Čišćenje (scripts/build_data.py): unicode superscripts → math, math-italic slova → ASCII, \bullet→\cdot, stepen^{...}, ${^\circ}$→°, dijakritike u math→tekst, grčka slova→$\alpha$..., merge susjednih math segmenata, icomma decimalni zarezi
- ~110 per-question ispravki (scripts/build_data.py OV): vraćene sve izgubljene formule; uklonjen duplikat #16 (=#15); ispravljeni tačni odgovori (#159 N(-3,0), #167 D, #230 D); ispravljene greške u rješenjima (#92, #131, #138, #141, #184, #129 usklađeno sa postupkom); čiste tabele NZS/NZD; sistem jednačina preko \begin{cases}; tabela za #185
- Re-lettering opcija A-D, prazne opcije odbačene (166/181/182 → 2 opcije; 196/222/256 → 3 opcije), napomene o slikama koje nisu postojale u originalu (#241)
- LaTeX generator (scripts/gen_tex.py): article 10pt, fontspec lmroman10 (file-based), amsmath, icomma, enumitem custom liste, needspace protiv orphana, hyperlink TOC+bookmarks, 7 oblasti, 267 pitanja, 91 \includegraphics (originalne grafike), zeleni tačni odgovori s ✓
- Kompajlacija: pdf.py convert.latex (Tectonic) — 0 Overfull/Underfull boxova
- Naslovna: Template 04 (Midnight Blue), cover_validate.js + poster_validate.py PASS, html2poster.js render, pypdf append merge (čuva linkove), outline rekonstruisan preko pymupdf (+1 page shift)
- QA: pdf_qa (samo heuristička upozorenja: formula-overflow median false-positive kod kratkih linija kviz formata; margin symmetry false-positive na stranicama sa slikama; TOC linkovi su kind=4 named — funkcionalni, checker traži kind=1), font.check 0 problema, toc.check PASS, pages.clean: nema praznih stranica, meta.set Title/Author/Creator/Subject/Keywords
- Ispravljene 3 ciklusa bugova: q→question mapping u override-ima, konv_sup core/sup split, > blockquote regex koji je jeo ">" u matematici, 5 slika vraćenih u override-ima (110, 242, 247, 258, 261), margin overflow "Rješenje:" labela, TOC-first redoslijed, zadnja strana kompletno pitanje
- JSON export (scripts/export_json.py): 267 pitanja, id/original_no/topic/question/images/options/correct_letter/correct_index/solution; math u LaTeX zapisu (KaTeX/MathJax ready), slike kao media/imageN.ext

Stage Summary:
- Deliverables u /home/z/my-project/download/:
  - kviz-matematika.pdf (56 strana, 1.9 MB: naslovna + TOC + intro + 267 pitanja + 91 slika)
  - pitanja.json (267 pitanja, strukturirano za web kviz)
  - kviz-matematika-latex.zip (kviz-matematika.tex + media/ 87 slika + pitanja.json)
- Ključne odluke: originalne slike ugrađene u PDF (korisnik bira napomenu, ali slike postoje u docx — ugrađene uz napomenu samo gdje ne postoje); pitanja renumerisana 1-267 (duplikat uklonjen), originalni brojevi u JSON original_no
- Build artefakti: /home/z/my-project/work/quiz/ (build/ kviz.tex, media/, kviz-final.pdf, cover.html)
- Skripte: /home/z/my-project/scripts/ (parse_quiz.py, build_data.py, gen_tex.py, export_json.py, merge_cover.py, check_lost_images.py, scan_anomalies.py, show_final.py, dump_review.py, show_quiz.py)

---
Task ID: 2
Agent: main (Z.ai)
Task: Web aplikacija "Kviz Matura" — banka pitanja iz 3 predmeta (matematika/bosanski/engleski), 2 moda igranja, email auth, zaštita od skrejpanja, responzivan dizajn.

Work Log:
- fullstack-dev skill: Next.js 16 + Tailwind 4 + shadcn/ui + Prisma/SQLite; instalirano bcryptjs, jose, katex, server-only
- Parsiranje Excela (scripts/parse_excel_bank.py): BosanskiJezik → 150 pitanja, engleski jezik → 75; teme+nivoi dodijeljeni po BOS-STAT/ENG-STAT rasporedima (književnost/jezik/pravopis/kultura/medijska ↔ vokabular/gramatika/čitanje; 40/40/20 nivoi); engleski passage razdvojen na "QUESTION:" markeru
- Prisma šema: User, Question (correctIndex server-only), QuizSession (questionIdsJson, currentIndex, status), QuizAnswer; db:push + seed 492 pitanja (267 mat iz pitanja.json + 150 + 75); matematika nivoi po 40/40/20 redoslijedu; slike u public/quiz-media/ (87 fajlova)
- Zaštita od skrejpanja: correctIndex NIKAD u payloadu prije odgovora; pitanja jedno po jedno kroz sesiju (current/answer endpointi sa currentIndex validacijom); učenje: otkrivanje tek nakon odgovora; test: bez ikakvog otkrivanja do finish-a; rate limit (60/min po korisniku na kviz, 10/min po IP na auth); JWT httpOnly cookie (jose HS256, AUTH_SECRET u .env); bcrypt hash lozinki; zaštita od duplog odgovaranja
- API: auth/register|login|logout|me, quiz/start (raspored pitanja 4/4/2 ili 3/4/3 po nivoima za test; proporcionalno za učenje; opcioni topic filter), current, answer, finish (kompletan pregled nakon završetka), history, meta (samo brojevi)
- UI (SPA u page.tsx, samo / ruta): Landing (hero sa gradijentima, kartice predmeta, kartice modova), AuthView (prijava/registracija tabovi), Dashboard (kartice predmeta + setup dialog: mod/tema/broj pitanja + historija), QuizPlayer (progress bar, passage box "Tekst za čitanje", KaTeX formule, tastatura 1-4/A-D+Enter, feedback banner + rješenje kartica u modu učenja, exit dialog), Results (animirani score ring, poruka po postotku, accordion pregled — promašeni auto-otvoreni, rješenja + slike), StatsView (prosjeci po predmetu + tabela testova)
- Dizajn: Sora + Inter fontovi, krem/smaragdna paleta (bez indigo/plave), jantar akcent, subjekt boje (violet/emerald/amber), svijetla+tamna tema (next-themes), framer-motion animacije, sticky footer, responzivno mobile-first
- Bugfix: turbopack držao stari globals.css cache → restart dev servera + rm -rf .next
- Browser verifikacija (agent-browser): registracija → dashboard → učenje matematike (KaTeX 15/25 frakcije, rješenje 15:5/25:5=3/5, feedback tačno/netačno) → rezultati (2/10, pregled, promašeni auto-otvoreni) → test engleskog 10 pitanja → statistika → mobile iPhone 14 (dashboard+kviz) → tamna tema → čitanje passage box → logout/login; API: 401 bez prijave, 0 curenja odgovora u payloadima; lint čist; dev.log bez grešaka

Stage Summary:
- Aplikacija radi na portu 3000 (SPA): 492 pitanja u SQLite (db/custom.db), seed skripta scripts/seed.ts za reset
- Ključne odluke: Excel "Matematika" sheet ignorisan (nepotpun, 69/150 redova) — matematika iz JSON-a (267 pitanja + rješenja + slike); test = 10 pitanja po oficijalnoj strukturi ispita iz STAT sheetova
- Sigurnosna arhitektura: tačni odgovori napuštaju server samo (a) u modu učenja za već odgovoreno pitanje, (b) u pregledu nakon završetka sesije — masovno skrejpanje nemoguće bez sesije + rate limita

---
Task ID: 3
Agent: main (Z.ai)
Task: Pripremiti aplikaciju za preuzimanje + hosting vodič (korisnik pita: kako skinuti, kako hostovati, koja baza, gdje se šta čuva).

Work Log:
- Seed skripta učinjena prenosivom: paths /home/z/my-project/... → relativno data/ (scripts/seed.ts), dodata path uvoz
- Kreiran data/ folder: matematika.json (267) + bosanski.json (150) + engleski.json (75) — prekopirano iz download/ i work/quiz/bank/
- Verifikacija: bun scripts/seed.ts → 492/492 (BOSANSKI=150, ENGLESKI=75, MATEMATIKA=267)
- Kreiran .env.example (DATABASE_URL + AUTH_SECRET uputstvo), db/.gitkeep
- Napisan VODIC.md (bosanski): tabela "gdje se šta čuva", lokalno pokretanje, hosting opcije A-D (VPS+Nginx+pm2+certbot sa kompletnim konfiguracijama, Railway volume, Render, demo), napomena da Vercel ne ide sa SQLite, zaštita od skrejpanja, dodavanje pitanja, struktura projekta
- README.md prepravljen (upućuje na VODIC.md)
- ZIP: download/kviz-matura-aplikacija.zip (2.4 MB, 228 fajlova) — bez node_modules/.next/.env/custom.db/logova; sadrži src, prisma, public/quiz-media (87 slika), data, scripts/seed.ts, VODIC, README, .env.example, konfiguracija

Stage Summary:
- Korisnik može preuzeti kviz-matura-aplikacija.zip; pokretanje: npm install → cp .env.example .env → db:push → seed → dev/start
- Baza: SQLite u db/custom.db; backup = kopija tog fajla

---
Task ID: 4
Agent: main (Z.ai)
Task: Render hosting — detaljno objasniti i tehnički pripremiti projekt (korisnik pita: kako postaviti na Render i da li će baza raditi).

Work Log:
- Web search Render docs: persistent disk SAMO na plaćenim planovima (free = efemeralan FS, spin-down 15 min), disk snapshoti dnevno (7 dana zadrška), PORT env (default 10000), NODE_VERSION varijabla, disallowed mount paths
- package.json: start promijenjen bun → node (standalone), dodana skripta "seed": "tsx scripts/seed.ts"; tsx dodan kao devDependency
- seed.ts idempotentan: ako baza već ima pitanja → preskače (korisnici/historija se NE brišu pri redeployu); --force za prisilno ponovno punjenje; testirano (492 → skip)
- .gitignore: !.env.example (da ode na GitHub), db/*.db + db/*.db-journal isključeni; .node-version = 22
- render.yaml blueprint: node runtime, plan starter, region frankfurt, disk /data 1GB, DATABASE_URL=file:/data/custom.db, AUTH_SECRET generateValue, build = prisma generate && db:push && seed && build
- Verifikacija: npm run build OK (standalone); PORT=3999 node .next/standalone/server.js → HTTP 200 + /api/quiz/meta vraća podatke (identično Render ponašanju)
- package-lock.json generisan (--package-lock-only) + bun.lock izbačen iz ZIP-a → Render deterministički koristi npm
- VODIC.md: Opcija C Render proširena u kompletan vodič (Korak 0 GitHub upload sa 100-fajl ograničenjem/načinima, Korak 1 kreiranje servisa + disk + varijable + komande, blueprint shortcut, redeploy ponašanje, backup/snapshoti, custom domena), Opcija D = free za test; Railway/lokalne sekcije prebačene na npm run seed
- README.md ažuriran (npm run seed); ZIP re-pakovan: 230 fajlova, render.yaml/.node-version/package-lock.json uključeni, bez .env/custom.db/bun.lock

Stage Summary:
- Odgovor korisniku: baza radi na Renderu SAMO uz Starter plan + Persistent Disk (free briše bazu pri restartu); kompletan korak-po-korak u VODIC.md Opcija C; render.yaml omogućava blueprint deploy bez ručnog klikanja
- ZIP download/kviz-matura-aplikacija.zip spreman za GitHub push → Render

---
Task ID: 5
Agent: main (Z.ai)
Task: Napisati najlakši način deploya na Render (korisnički zahtjev "najlakse").

Work Log:
- Kreiran DEPLOY-RENDER.md — kompaktni checklist (3 koraka: GitHub repo preko web uploada u 2 serije zbog limita 100 fajlova, Blueprint deploy preko render.yaml, provjera build loga) + tabela "nakon deploya" (auto-deploy, seed --force, backup, domena, upozorenje za Free plan)
- DEPLOY-RENDER.md dodan u download/kviz-matura-aplikacija.zip (231 fajl)

Stage Summary:
- Najlakši put = GitHub web upload + render.yaml Blueprint (render.yaml sam kreira servis, disk /data 1GB, varijable, AUTH_SECRET); kartica potrebna za Starter plan (~7,25 $/mj)

---
Task ID: 6
Agent: main (Z.ai)
Task: Dodati podatke za SREDNJU ŠKOLU (novi Excel + DOCX) u aplikaciju — isti koncept, spremno za Render.

Work Log:
- Analiza uploadovanih fajlova: rjesenja tabela-MM_3.docx = IDENTIČNA postojećoj matematici (diff samo header) → matematika ostaje ista (267); SrednjaSkolaPitanja.xlsx = NOVE banke: BosanskiJezik 301 + engleski jezik 475 (preklapanje sa starim: 1/0 pitanja)
- Excel specifičnosti: ENG ima 2-5 opcija (99 sa 5 opcija A-E!), "Tačan" formati "X)" (446) i "X." (29), passage pitanja (129: "QUESTION:" marker bilo koja kombinacija velikih/malih slova + "Read the text" prefiks), BOS passage u istoj ćeliji ("Pročitaj sljedeći odlomak" — 6 izdvojeno u passage polje)
- STAT sheetovi → mapiranje: BOS teme Pravopis q1-85/Jezik 86-164/Teorija knj. 165-245/Historija knj. 246-301, nivoi 135/119/47; ENG nivoi iz 13 range kolona (kolizija q87 riješena prioritetom SREDNJI), teme: passage→Čitanje i razumijevanje, ostalo→Vokabular i gramatika
- Parser scripts/parse_srednja.ts → data/srednja-bosanski.json (301) + data/srednja-engleski.json (475) — 0 anomalija; opsi skripte: inspect_srednja, compare_banks, validate_srednja, inspect_passages
- Prisma: Question.school + QuizSession.school (OSNOVNA|SREDNJA, default OSNOVNA), index [school,subject]; db:push + seed --force → 1268 pitanja (BOSANSKI=451, ENGLESKI=550, MATEMATIKA=267; matematika=OVO SADA SREDNJA)
- quiz-engine: School tip, SUBJECTS[subject].schools{testMix}: MATH SREDNJA 4/4/2=10; BOS OSNOVNA 4/4/2=10, SREDNJA 8/8/4=20; ENG OSNOVNA 3/4/3=10, SREDNJA 7/7/6=20; pickQuestionIds(subject, school, ...); testCount helper
- API: start (school param, sesija.school), meta (schools{nivo→predmet→topics+testTotal}), history (bySubject ključ "school:subject"), finish (school u odgovoru)
- UI: dashboard switcher Srednja(MATURA)/Osnovna(ZAVRŠNI RAD) sa filtriranjem kartica; quiz-player opcije A-E + tastatura 1-5; results A-E + škola u chipu; stats grupisano po škola+predmet; landing 1268 pitanja; footer ažuriran; client.ts: SCHOOL_LABEL + OPTION_LETTERS
- Dokumentacija: VODIC.md/README/DEPLOY-RENDER 492→1268, Seed zavrsen log brojke
- Verifikacija: lint čist, build OK, browser E2E: registracija → dashboard (SREDNJA: 3 kartice tačne brojke) → engleski srednja učenje (5 opcija A-E, passage box "Tekst za čitanje", feedback "Netačno — tačan odgovor je B") → test mod 20 pitanja → OSNOVNA (samo bosanski 150 + engleski 75) → matematika srednja (KaTeX frakcije, rješenje u feedbacku) → mobile iPhone 14 (switcher + kartice responzivni)

Stage Summary:
- Aplikacija sada ima 1268 pitanja: OSNOVNA (bosanski 150, engleski 75) + SREDNJA (matematika 267, bosanski 301, engleski 475)
- Test strukture po školi/predmetu iz STAT sheetova; zaštita od skrejpanja netaknuta (correctIndex server-only, sesije, rate limit)
- ZIP download/kviz-matura-aplikacija.zip (2.5 MB, 238 fajlova) ažuriran — spreman za GitHub → Render (isti postupak kao Opcija C u VODIC.md)

---
Task ID: 7
Agent: main (Z.ai)
Task: Spojiti Osnovnu i Srednju školu u jednu aplikaciju — korisnik: "samo mi ovde fali kod osnovne matematika, ostavio si bosanski i engleski, da ne pravim dvije aplikacije zasebno".

Work Log:
- Uzrok: Task 6 stavio matematiku SAMO u SREDNJA → u Osnovnoj prikazu ostali samo bosanski+engleski
- Rješenje: nova vrijednost school='OBA' (zajednička banka za obje škole), bez dupliranja redova u bazi
- scripts/seed.ts: matematika sada school='OBA'; ažuriran header komentar
- src/lib/quiz-engine.ts: SCHOOL_SHARED='OBA' + pickQuestionIds where school IN [izabrana,'OBA']; SUBJECTS.MATEMATIKA.schools dobila i OSNOVNA testMix (4/4/2=10, ista banka)
- src/app/api/quiz/meta/route.ts: 'OBA' redovi se folduju u OBE škole (OSNOVNA i SREDNJA prikazuju matematiku 267)
- src/app/layout.tsx: SEO opis 492 → 1268 pitanja + "osnovna i srednja škola u jednoj aplikaciji"
- Re-seed --force: 1268/1268 (MATEMATIKA school='OBA' 267, OSNOVNA 225, SREDNJA 776)
- Verifikacija: lint čist, build OK; standalone server na :3999 → meta API: OSNOVNA {MATEMATIKA 267, BOSANSKI 150, ENGLESKI 75}, SREDNJA {MATEMATIKA 267, BOSANSKI 301, ENGLESKI 475}; API E2E: registracija → start OSNOVNA+MATEMATIKA učenje (5 pitanja, 0 curenja odgovora) → answer (correctIndex+solution tek nakon odgovora) → TEST mod OSNOVNA matematika = 10 pitanja (4/4/2) → SREDNJA regresija OK
- Browser E2E (agent-browser): registracija → dashboard Srednja (3 kartice) → Osnovna (Matematika 267 · 7 tema + Bosanski 150 + Engleski 75) → pokrenuto učenje matematike → Pitagorina teorema s KaTeX formulama → odgovor → "Tačno! Odličan odgovor." → sljedeće pitanje
- Dokumentacija: VODIC.md (tabela baze: matematika 267 zajednička + osnovna 225 + srednja 776; seed opis; data/ = 5 JSON fajla)
- ZIP re-pakovan: download/kviz-matura-aplikacija.zip (238 fajlova, ~3.7 MB), leak check čist (.env/db/bun.lock/logovi isključeni), izmijenjeni fajlovi potvrđeni u ZIP-u

Stage Summary:
- JEDNA aplikacija, 1268 pitanja: Osnovna prikazuje sve 3 predmeta (matematika 267 + bosanski 150 + engleski 75 = 492), Srednja sve 3 (matematika 267 + bosanski 301 + engleski 475 = 1013); matematika je ista banka u obje (nema duplikata u bazi)
- Zaštita od skrejpanja netaknuta; Render-ready ZIP isti koncept (render.yaml, idempotentan seed, package-lock.json, DEPLOY-RENDER.md)
