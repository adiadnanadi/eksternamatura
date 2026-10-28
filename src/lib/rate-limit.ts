import 'server-only'

/**
 * Jednostavan in-memory rate limiter (sliding window).
 * Brani: brute-force na login/registraciju i skripte koje bi masovno
 * vukla pitanja preko API-ja.
 */
type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b) {
    b = { hits: [] }
    buckets.set(key, b)
  }
  b.hits = b.hits.filter(t => now - t < windowMs)
  if (b.hits.length >= limit) {
    const oldest = b.hits[0]
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000) }
  }
  b.hits.push(now)
  // čišćenje starih bucket-a da memorija ne raste
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.hits.length === 0 || now - v.hits[v.hits.length - 1] > windowMs * 2) {
        buckets.delete(k)
      }
    }
  }
  return { ok: true, retryAfterSec: 0 }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'local'
}
