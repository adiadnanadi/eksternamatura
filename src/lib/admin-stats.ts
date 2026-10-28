import 'server-only'
import { db } from '@/lib/db'

export type SourceStat = { label: string; count: number }
export type DayPoint = { day: string; count: number }

export type AdminStats = {
  totals: {
    visits: number
    visitsToday: number
    visits7d: number
    visits30d: number
    users: number
    users7d: number
    loggedVisits30d: number
  }
  daily: DayPoint[]
  sources: SourceStat[]
  countries: SourceStat[]
  devices: SourceStat[]
  pages: SourceStat[]
  recent: {
    id: string
    createdAt: string
    source: string
    country: string
    city: string | null
    device: string
    path: string
    ip: string | null
    email: string | null
  }[]
}

const DAY = 24 * 60 * 60 * 1000

// Prisma groupBy vraća _count u različitim oblicima zavisno od verzije — čitamo ga robustno
function groupCount(row: { _count?: unknown }): number {
  const c = row._count as number | Record<string, number> | undefined
  if (typeof c === 'number') return c
  if (c && typeof c === 'object') return c._all ?? Object.values(c)[0] ?? 0
  return 0
}

// ISO kod → naziv držake (radi i na serveru i u browseru)
export function countryName(code: string): string {
  if (!code || code === '?') return 'Nepoznato'
  try {
    const dn = new Intl.DisplayNames(['bs', 'sr', 'en'], { type: 'region' })
    const n = dn.of(code.toUpperCase())
    return n && n !== code ? n : code
  } catch {
    return code
  }
}

export async function loadAdminStats(): Promise<AdminStats> {
  const now = Date.now()
  const startOfToday = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  const d7 = new Date(now - 7 * DAY)
  const d30 = new Date(now - 30 * DAY)

  const [
    visits,
    visitsToday,
    visits7d,
    users,
    users7d,
    bySource,
    byCountry,
    byDevice,
    byPath,
    recent,
    loggedVisits30d,
  ] = await Promise.all([
    db.visit.count(),
    db.visit.count({ where: { createdAt: { gte: startOfToday } } }),
    db.visit.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.visit.groupBy({
      by: ['source'],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
      take: 15,
    }),
    db.visit.groupBy({
      by: ['country'],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take: 15,
    }),
    db.visit.groupBy({
      by: ['device'],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      orderBy: { _count: { device: 'desc' } },
    }),
    db.visit.groupBy({
      by: ['path'],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 15,
    }),
    db.visit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // uzmemo više pa deduplikujemo: po osobi samo zadnja posjeta
      select: {
        id: true,
        createdAt: true,
        source: true,
        country: true,
        city: true,
        device: true,
        path: true,
        ip: true,
        userId: true,
        user: { select: { email: true } },
      },
    }),
    db.visit.count({ where: { createdAt: { gte: d30 }, userId: { not: null } } }),
  ])

  // dnevna serija: zadnjih 30 dana, popunjeno nulama
  const bucket = new Map<string, number>()
  const thirty = await db.visit.findMany({
    where: { createdAt: { gte: d30 } },
    select: { createdAt: true },
  })
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10)
    bucket.set(day, 0)
  }
  for (const v of thirty) {
    const k = v.createdAt.toISOString().slice(0, 10)
    bucket.set(k, (bucket.get(k) || 0) + 1)
  }
  const daily: DayPoint[] = [...bucket.entries()].map(([day, count]) => ({ day, count }))

  // Recent: po ulogovanoj osobi SAMO zadnja posjeta (lista je desc → prvi viđen = zadnji).
  // Anonimne posjete (bez naloga) ostaju pojedinačno.
  const seenUsers = new Set<string>()
  const recentDeduped = recent.filter(r => {
    if (!r.userId) return true
    if (seenUsers.has(r.userId)) return false
    seenUsers.add(r.userId)
    return true
  })

  return {
    totals: {
      visits,
      visitsToday,
      visits7d,
      visits30d: thirty.length,
      users,
      users7d,
      loggedVisits30d,
    },
    daily,
    sources: bySource.map(r => ({ label: r.source, count: groupCount(r) })),
    countries: byCountry.map(r => ({ label: countryName(r.country), count: groupCount(r) })),
    devices: byDevice.map(r => ({ label: r.device, count: groupCount(r) })),
    pages: byPath.map(r => ({ label: r.path, count: groupCount(r) })),
    recent: recentDeduped.slice(0, 25).map(r => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      source: r.source,
      country: r.country,
      city: r.city,
      device: r.device,
      path: r.path,
      ip: r.ip,
      email: r.user?.email ?? null,
    })),
  }
}
