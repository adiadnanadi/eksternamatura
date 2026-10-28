import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function page(title: string, msg: string, tone: 'ok' | 'err'): Response {
  const color = tone === 'ok' ? '#059669' : '#dc2626'
  return new NextResponse(
    `<!doctype html><html lang="bs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
    <body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8fafc;margin:0">
      <div style="max-width:420px;padding:32px;background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center">
        <div style="width:52px;height:52px;margin:0 auto 16px;border-radius:16px;background:${color}18;color:${color};display:flex;align-items:center;justify-content:center;font-size:26px">${tone === 'ok' ? '✓' : '✕'}</div>
        <h1 style="margin:0 0 8px;font-size:20px;color:#111">${title}</h1>
        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.5">${msg}</p>
        <a href="/" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:11px 22px;border-radius:12px;font-weight:600;font-size:14px">Idi na početnu</a>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// GET /api/auth/verify?token=... — link iz verifikacionog emaila
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = (url.searchParams.get('token') || '').trim()
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return page('Neispravan link', 'Link za potvrdu emaila nije ispravan. Pokušaj ponovo iz emaila.', 'err')
  }
  let user
  try {
    user = await db.user.findUnique({ where: { verificationToken: token } })
  } catch {
    return page('Greška', 'Došlo je do greške. Pokušaj ponovo.', 'err')
  }
  if (!user) {
    return page(
      'Link je već iskorišten',
      'Ovaj link je već iskorišten ili ne postoji. Ako si već potvrdio/la email — samo se prijavi.',
      'err'
    )
  }
  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verificationToken: null },
  })
  return page(
    'Email potvrđen!',
    `Hvala ${user.name} — tvoj nalog je aktivan. Možeš se prijaviti.`,
    'ok'
  )
}
