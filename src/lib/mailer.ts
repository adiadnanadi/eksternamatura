import 'server-only'
import nodemailer from 'nodemailer'

// Slanje verifikacionog emaila preko Gmail SMTP-a.
// Potrebno u Render env: GMAIL_USER (tvoja Gmail adresa) + GMAIL_APP_PASSWORD
// (App Password iz Google Account → Security → 2-Step Verification → App passwords).
// Ako env nije podešen — registracija radi bez verifikacije (auto-verifikacija),
// da app nikad ne bude blokiran.

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  if (!isSmtpConfigured()) return false
  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
    const link = `https://maturatk.onrender.com/api/auth/verify?token=${token}`
    await transport.sendMail({
      from: `"Kviz Matura" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Potvrdi svoj email — Kviz Matura',
      text: `Zdravo ${name},\n\nPotvrdi svoj email klikom na link:\n${link}\n\nLink vrijedi 24 sata.\nA nisi ti to tražio/la — ignoriši ovu poruku.`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:28px 20px;color:#111">
          <h2 style="margin:0 0 8px">Potvrdi svoj email</h2>
          <p style="margin:0 0 20px;color:#444">Zdravo ${name}, klikni na dugme ispod da aktiviraš nalog na <b>Kviz Matura</b>.</p>
          <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600">Potvrdi email</a>
          <p style="margin:20px 0 0;color:#888;font-size:13px">Ili kopiraj link:<br/><span style="word-break:break-all">${link}</span></p>
          <p style="margin:8px 0 0;color:#888;font-size:12px">Link vrijedi 24 sata. Ako nisi ti registrovao/la nalog — ignoriši.</p>
        </div>`,
    })
    return true
  } catch (err) {
    console.error('[mail] slanje verifikacije nije uspjelo:', err)
    return false
  }
}
