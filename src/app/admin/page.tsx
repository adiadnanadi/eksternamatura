import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { loadAdminStats } from '@/lib/admin-stats'
import { AdminStatsView } from '@/components/admin/admin-stats-view'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSessionUser()
  if (!session || !isAdminEmail(session.email)) redirect('/')

  const stats = await loadAdminStats()
  return <AdminStatsView stats={stats} email={session.email} />
}
