'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Users,
  Activity,
  CalendarDays,
  Globe2,
  MonitorSmartphone,
  RefreshCw,
  ArrowLeft,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { AdminStats } from '@/lib/admin-stats'

const dailyConfig = {
  count: {
    label: 'Posjete',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function fmtDay(iso: string) {
  // 2026-10-28 → 28.10.
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

function fmtTime(iso: string) {
  const dt = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`
}

function TopList({ title, icon, items }: { title: string; icon: React.ReactNode; items: { label: string; count: number }[] }) {
  const max = items[0]?.count || 1
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nema podataka (30 dana).</p>
        )}
        {items.map(it => (
          <div key={it.label} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{it.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{it.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, Math.round((it.count / max) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AdminStatsView({ stats, email }: { stats: AdminStats; email: string }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const cards = [
    { title: 'Ukupno posjeta', value: stats.totals.visits, icon: Eye },
    { title: 'Danas', value: stats.totals.visitsToday, icon: CalendarDays },
    { title: 'Zadnjih 7 dana', value: stats.totals.visits7d, icon: Activity },
    { title: 'Zadnjih 30 dana', value: stats.totals.visits30d, icon: Globe2 },
    { title: 'Korisnika ukupno', value: stats.totals.users, icon: Users },
    { title: 'Novih korisnika (7 d)', value: stats.totals.users7d, icon: Users },
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Button>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Statistika posjeta</h1>
            <p className="text-sm text-muted-foreground">Odakle ljudi ulaze — zadnjih 30 dana</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">{email}</Badge>
          <Button size="sm" variant="outline" onClick={refresh} className="rounded-xl" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Osvježi
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(c => (
          <Card key={c.title} className="rounded-2xl border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <c.icon className="h-3.5 w-3.5" />
                <span className="truncate">{c.title}</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6 rounded-2xl border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Posjete po danima</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={dailyConfig} className="h-56 w-full">
            <BarChart data={stats.daily} margin={{ left: -18, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="day"
                tickFormatter={fmtDay}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                fontSize={11}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} labelFormatter={l => String(l)} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TopList title="Odakle dolaze" icon={<Globe2 className="h-4 w-4" />} items={stats.sources} />
        <TopList title="Države" icon={<Globe2 className="h-4 w-4" />} items={stats.countries} />
        <TopList title="Uređaji" icon={<MonitorSmartphone className="h-4 w-4" />} items={stats.devices} />
        <TopList title="Stranice" icon={<Eye className="h-4 w-4" />} items={stats.pages} />
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Zadnje posjete</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vrijeme</TableHead>
                <TableHead>Izvor</TableHead>
                <TableHead>Lokacija</TableHead>
                <TableHead>Uređaj</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Stranica</TableHead>
                <TableHead>Korisnik</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Još nema zabilježenih posjeta.
                  </TableCell>
                </TableRow>
              )}
              {stats.recent.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtTime(r.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{r.source}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.country === '?' ? '—' : r.country}
                    {r.city ? ` · ${r.city}` : ''}
                  </TableCell>
                  <TableCell className="text-xs">{r.device}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {r.ip || '—'}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-xs">{r.path}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {r.email || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
