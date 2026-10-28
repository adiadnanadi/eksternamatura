# Deploy na Render — najlakši put (checklist)

> Trajanje: ~15 minuta. Rezultat: aplikacija na `https://nesto.onrender.com` sa HTTPS-om,
> baza koja preživljava restarte, auto-deploy pri svakom git push.

## Šta ti treba
- ZIP `kviz-matura-aplikacija.zip` (raspakovan)
- **Kartica** za Render (Starter plan ~7 $/mj + disk ~0,25 $ — obavezno za trajnu bazu)
- Besplatan GitHub nalog

---

## Korak 1 — GitHub repo (5 min)

1. Raspakuj zip na računar.
2. Idi na **github.com** → prijava/registracija → **New repository**
   (ime npr. `kviz-matura`, Private je OK) → **Create**.
3. Klikni **"uploading an existing file"** (link na praznoj repo stranici).
4. Prevuci sadržaj raspakovanog foldera — GitHub prima max 100 fajlova odjednom,
   pa radi u 2 serije:
   - Serija 1: folderi `src`, `public`, `data`, `prisma`, `scripts`, `db`
   - Serija 2: svi preostali fajlovi (package.json, package-lock.json, render.yaml,
     VODIC.md, README.md, .gitignore, .env.example, next.config.ts, ostale konfiguracije)
   - ⚠️ `.env` i `db/custom.db` ne postoje u zipu i ne trebaju na GitHub.
5. Klikni **Commit changes** i sačekaj upload.

*Alternativa bez klikanja: **GitHub Desktop** aplikacija → File → Add local repository → Publish.*

## Korak 2 — Render (5 min)

1. **dashboard.render.com** → prijava preko GitHub-a (najlakše).
2. **New + → Blueprint** → izaberi svoj repo.
3. Render automatski čita **`render.yaml`** i prikazuje šta će kreirati:
   web servis (Node, Starter, Frankfurt) + trajni disk 1 GB na `/data`
   + varijable `DATABASE_URL=file:/data/custom.db` i `AUTH_SECRET` (sam generiše).
4. Po potrebi dodaj karticu (za Starter plan) → **Apply**.

## Korak 3 — čekaj build (~5 min)

U logu builda vidiš redom: npm install → prisma generate → db:push →
`Seed zavrsen: BOSANSKI=451, ENGLESKI=550, MATEMATIKA=267` → build → live.

Aplikacija je **live** na `https://tvoje-ime.onrender.com` — registruj nalog i testiraj.

---

## Nakon deploya — šta važi

| Šta | Kako |
|---|---|
| Izmjena koda | push na GitHub → Render sam redeployuje |
| Dodavanje pitanja | izmijeni `data/*.json` → push; `seed` se sam ne duplira |
| Prisilno osvježavanje pitanja | Render → Shell → `npm run seed -- --force` |
| Backup baze | automatski dnevni snapshot (Dashboard → Disk), ili Shell: `cp /data/custom.db /data/backup-$(date +%F).db` |
| Vlastiti domen | Settings → Custom Domains → CNAME na `tvoje-ime.onrender.com` |
| Važno ⚠️ | nemoj prebacivati na Free plan — free nema disk pa se baza briše pri restartu |

Detaljnija objašnjenja: **VODIC.md** (Opcija C).
