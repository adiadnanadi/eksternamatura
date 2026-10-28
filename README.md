# Kviz Matura — banka pitanja (matematika, bosanski, engleski)

Next.js 16 + Prisma/SQLite aplikacija sa dva moda igranja (učenje i test), email
registracijom, statistikom i zaštitom od skrejpanja pitanja.

**👉 Za uputstvo za pokretanje i hosting otvori [VODIC.md](./VODIC.md).**

Ukratko:

```bash
npm install
cp .env.example .env        # promijeni AUTH_SECRET
npm run db:push             # kreira SQLite bazu (db/custom.db)
npm run seed                # ubacuje 1581 pitanje (osnovna + srednja škola)
npm run dev                 # http://localhost:3000
```
