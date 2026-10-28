// Admin pristup: email iz ADMIN_EMAILS env varijable (zarezom odvojeni)
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.trim().toLowerCase())
}
