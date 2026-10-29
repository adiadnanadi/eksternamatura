import 'server-only'

// Slanje verifikacionog emaila preko Brevo API-ja (HTTPS — radi i na Render free,
// za razliku od SMTP portova koje Render free blokira).
// Env: BREVO_API_KEY (Brevo → Settings → SMTP & API → API Keys, počinje xkeysib-).

const SENDER = { name: 'Kviz Matura', email: 'naidaselmic2006@gmail.com' }

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY)
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  if (!isEmailConfigured()) return false
  const link = `https://maturatk.onrender.com/api/auth/verify?token=${token}`
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY as string,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: to, name }],
        subject: 'Potvrdi svoj email — Kviz Matura',
        textContent: `Zdravo ${name},\n\nPotvrdi svoj email klikom na link:\n${link}\n\nLink vrijedi 24 sata.\nA nisi ti to tražio/la — ignoriši ovu poruku.`,
        htmlContent: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:28px 20px;color:#111">
            <h2 style="margin:0 0 8px">Potvrdi svoj email</h2>
            <p style="margin:0 0 20px;color:#444">Zdravo ${name}, klikni na dugme ispod da aktiviraš nalog na <b>Kviz Matura</b>.</p>
            <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600">Potvrdi email</a>
            <p style="margin:20px 0 0;color:#888;font-size:13px">Ili kopiraj link:<br/><span style="word-break:break-all">${link}</span></p>
            <p style="margin:8px 0 0;color:#888;font-size:12px">Link vrijedi 24 sata. Ako nisi ti registrovao/la nalog — ignoriši.</p>
          </div>`,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[mail] Brevo greška', res.status, body.slice(0, 300))
      return false
    }
    return true
  } catch (err) {
    console.error('[mail] slanje verifikacije nije uspjelo:', err)
    return false
  }
}
