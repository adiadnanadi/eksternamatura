# Kviz Matura — Vodič za pokretanje i hosting

Aplikacija za vježbanje iz **matematike, bosanskog i engleskog** (1581 pitanje za osnovnu i
srednju školu), sa dva moda
(učenje / test), registracijom i prijavom preko emaila, statistikom i zaštitom od skrejpanja.

---

## 1. Šta je baza i gdje se šta čuva?

| Šta | Gdje | Opis |
|---|---|---|
| **Baza podataka** | `db/custom.db` | **SQLite** — jedan fajl na disku. Nema servera, nema instalacije. |
| Sva pitanja (1581: osnovna 492 — matematika 267 + bosanski 150 + engleski 75; srednja 1089 — matematika 313 + bosanski 301 + engleski 475) | tabela `Question` | tekst, opcije (A–E), tačan odgovor, rješenja, slike, tema, nivo, školski nivo |
| Registrovani korisnici | tabela `User` | email, ime, **bcrypt hash** lozinke (lozinka se nikad ne čuva čitljivo) |
| Odradjeni kvizovi | tabela `QuizSession` | predmet, mod, status, progres, rezultat |
| Pojedinačni odgovori | tabela `QuizAnswer` | koji red, koji izbor, tačno/netačno |
| Slike pitanja (126) | `public/quiz-media/` | statički fajlovi koje server servira direktno |
| Izvorna pitanja (za seed) | `data/*.json` | koristi ih `scripts/seed.ts` za punjenje baze |
| Tajni ključ sesija + putanja baze | `.env` | **nikad ne dijeli javno ovaj fajl** |

> Backup cijele aplikacije = kopija koda + **jedan fajl** `db/custom.db`. Toliko.
> Backup baze u produkciji: `cp db/custom.db backup-$(date +%F).db`

---

## 2. Pokretanje na svojoj mašini (2 minute)

Potrebno: **Node.js 20+** ili **Bun** (preporuka: https://bun.sh).

```bash
# 1. raspakuj zip, uđi u folder
npm install          # ili: bun install

# 2. podesi varijable
cp .env.example .env # pa po želji promijeni AUTH_SECRET (openssl rand -base64 48)

# 3. kreiraj bazu i ubaci pitanja
npm run db:push      # kreira db/custom.db po prisma/schema.prisma
npm run seed         # ubacuje 1581 pitanje (osnovna: matematika 267 + bosanski 150 + engleski 75,
                     #  srednja: matematika 313 + bosanski 301 + engleski 475)

# 4. razvojni server
npm run dev          # http://localhost:3000

# ILI produkcija
npm run build
npm run start        # http://localhost:3000
```

---

## 3. Hosting — opcije

⚠️ **Važno:** baza je SQLite fajl na disku, pa hosting **mora imati perzistentan disk**.
Vercel **ne radi** sa ovim postavkama (serverless nema trajni disk) — koristi VPS ili
platformu ispod. Ako baš hoćeš Vercel, baza se mora preseliti na Turso/Postgres (može se dogovoriti kasnije).

### Opcija A — VPS (preporuka, potpuna kontrola) ~5 €/mj

Za: Hetzner, DigitalOcean, Contabo, bilo koji Ubuntu server.

```bash
# 1. Instalacija (na serveru, kao root)
apt update && apt install -y curl nginx
curl -fsSL https://bun.sh/install | bash          # ili Node 20: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs

# 2. Kod + build
cd /opt && git clone <tvoj-repo> kviz && cd kviz   # ili: unzip kviz.zip
npm install && cp .env.example .env && nano .env   # promijeni AUTH_SECRET!
npm run db:push && bun scripts/seed.ts
npm run build

# 3. Daemon koji drži aplikaciju živom (pm2)
npm install -g pm2
pm2 start "bun .next/standalone/server.js" --name kviz
pm2 save && pm2 startup                            # autostart nakon reboota

# 4. Nginx kao reverzni proxy + domen
nano /etc/nginx/sites-available/kviz
```

Sadržaj nginx konfiguracije (zamijeni `tvoj-domen.ba`):

```nginx
server {
    listen 80;
    server_name tvoj-domen.ba;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/kviz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 5. Besplatan HTTPS (Let's Encrypt)
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tvoj-domen.ba
```

Gotovo — aplikacija je na `https://tvoj-domen.ba`, a pm2 je drži živu.

> **Slike moraju ići zajedno sa buildom** — `npm run build` već kopira `public/`
> u standalone output, ništa ne trebaš raditi ručno.

### Opcija B — Railway (najbrže, bez servera) ~5 $/mj

1. Novi projekat → **Deploy from GitHub repo** (gurni kod na GitHub prvo).
2. **Variables**: dodaj `DATABASE_URL=file:/data/custom.db` i `AUTH_SECRET=<novi tajni ključ>`.
3. **Volumes**: dodaj volume montiran na `/data` (tu živi SQLite baza — preživljava redeploy).
4. Build: `npm run db:push && npm run build` · Start: `npm run start`.
   (Seed: pokreni jednom iz Railway shell-a: `npm run seed`.)
5. **Settings → Networking → Generate Domain** — dobiješ javni URL sa HTTPS-om.

### Opcija C — Render (detaljno, najlakše bez servera) ~7,50 $/mj

> ⚠️ **Odgovor na ključno pitanje: da li će baza raditi na Renderu?**
> **DA — ali samo ako dodaš Persistent Disk na plaćeni plan.** Render na free planu
> ima *efemeralan* disk: svaki restart/redeploy **briše fajl baze** (svi korisnici,
> rezultati i progres bi nestali), a servis se dodatno gasi poslije 15 min
> neaktivnosti. Free je stoga samo za kratko testiranje. Sa Starter planom (~7 $/mj)
> + diskom od 1 GB (~0,25 $/mj), SQLite baza živi na trajnom disku: preživljava
> deploye i restarte, a Render još **automatski pravi dnevni snapshot** (čuva se 7 dana).

#### Korak 0 — Kod na GitHub

Render deployuje samo iz Git repozitorija (GitHub/GitLab/Bitbucket) — ZIP ne može direktno.

1. Raspakuj zip lokalno i pokreni `npm install` — to kreira `package-lock.json`
   (Render ga koristi da instalira tačno iste verzije paketa; `bun.lock` možeš obrisati
   da Render sigurno koristi npm).
2. Pushuj kod na GitHub — najlakše preko **GitHub Desktop** aplikacije (File → Add local
   repository → Publish), ili na github.com → New repository → *uploading an existing
   file* (prevuci sadržaj foldera; GitHub prima max 100 fajlova odjednom, pa uploaduj
   u 2–3 serije). Ne brini: `.env` i `db/custom.db` su ignorisani i neće se pushovati.

#### Korak 1 — Kreiraj Web Service

1. Na https://dashboard.render.com se prijavi (može i GitHub nalogom).
2. **New + → Web Service** → poveži svoj GitHub repo.
3. Podešavanja:
   - **Runtime:** Node
   - **Region:** Frankfurt (najbliži BiH)
   - **Instance type:** Starter (obavezno — free ne podržava disk!)
4. **Advanced → Add Disk**:
   - Mount path: **`/data`**
   - Size: **1 GB** (možeš kasnije povećati, ne smanjiti)
5. **Environment variables** (u Advanced ili kartici Environment):
   - `DATABASE_URL` = `file:/data/custom.db`
   - `AUTH_SECRET` = dugi nasumični string → generiši: `openssl rand -base64 48`
6. Build i Start komande (Render ih sam predloži iz `render.yaml` ako ga koristiš,
   inače ih upiši ručno):
   - **Build:** `npx prisma generate && npm run db:push && npm run seed && npm run build`
   - **Start:** `npm run start`
7. **Create Web Service** — build traje par minuta. U logu ćeš vidjeti
   `Seed zavrsen: BOSANSKI=451, ENGLESKI=550, MATEMATIKA=267`.

Gotovo — aplikacija je na `https://tvoje-ime.onrender.com`, sa HTTPS-om.

> **Shortcut:** umjesto ručnog klikanja, u repozitoriju je **`render.yaml`** —
> Render → New + → **Blueprint** → izaberi repo → Apply: sam kreira servis, disk
> (mount `/data`), varijable i komande. AUTH_SECRET generiše automatski.

#### Šta se dešava pri svakom sljedećem deployu

- `git push` → Render automatski builda i restartuje (auto-deploy uključen).
- Build radi `db:push` (uskladi šemu bez gubitka podataka) i `seed` — seed je
  **pametan**: ako baza već sadrži pitanja, preskače se, pa se korisnici i historija
  **ne brišu** pri redeployu. Da prisilno osvježiš pitanja: Render Shell →
  `npm run seed -- --force`.
- Backup baze: Render sam snima disk jednom dnevno (Dashboard → Disk → Snapshots),
  a možeš i ručno u Shell-u: `cp /data/custom.db /data/backup-$(date +%F).db`.

#### Vlastiti domen (opciono)

Render → servis → **Settings → Custom Domains** → dodaj `www.tvoj-domen.ba` →
kod svog domenskog registara postavi CNAME na `tvoje-ime.onrender.com`. HTTPS
sertifikat Render obnavlja automatski.

### Opcija D — Render/Free za brzi test (BEZ trajne baze)

Isti koraci kao Opcija C, ali instance type **Free** i BEZ diska: aplikacija radi,
pitanja se seede pri svakom deployu, ALI su **korisnici i rezultati privremeni**
(nestaju pri restartu), a servis uspava poslije 15 min neaktivnosti (prvi klik se
buči ~50 s). Dobro samo da pogledaš kako izgleda prije kupovine Startera.

---

## 4. Šta je već zaštićeno (zaštita od skrejpanja)

- **Tačni odgovori žive samo u bazi** — server ih šalje klijentu isključivo:
  - u modu *učenje*, za pitanje na koje je korisnik **već odgovorio**, ili
  - u *pregledu nakon završenog testa*.
- Pitanja se **dijele jedno po jedno** kroz server-side sesiju (`QuizSession`) —
  ne postoji endpoint koji vraća svih 1581 pitanje odjednom.
- **Rate limit**: 60 zahtjeva/min po korisniku na kviz API, 10/min po IP na prijavu.
- Sesije: JWT u **httpOnly cookie** (nečitljiv iz JS-a), lozinke **bcrypt** hashirane.

---

## 5. Kako dodati / izmijeniti pitanja kasnije

1. Izmijeni `data/*.json` (isti format).
2. `npm run seed -- --force` — briše i ponovo ubacuje sva pitanja
   (korisnici i historija ostaju, jer su u posebnim tabelama).
3. Za izmjenu šeme baze: `npm run db:push`.

---

## 6. Struktura projekta (pregled)

```
├─ prisma/schema.prisma     # šema baze (User, Question, QuizSession, QuizAnswer)
├─ db/custom.db             # SQLite baza (kreira se: npm run db:push)
├─ data/                    # izvorna pitanja za seed (6 JSON fajlova: matematika za osnovnu i
│                           #  srednju, osnovna i srednja banka za bosanski/engleski)
├─ public/quiz-media/       # slike uz matematička pitanja (126: 87 osnovna + 39 srednja)
├─ src/app/api/             # API: auth/* i quiz/* (sva pravila igre na serveru)
├─ src/components/quiz/     # UI: landing, auth, dashboard, player, rezultati, statistika
├─ src/lib/                 # auth (JWT/bcrypt), quiz-engine, rate-limit, db klijent
└─ scripts/seed.ts          # punjenje baze iz data/
```
