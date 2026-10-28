import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ user: null }, { status: 200 })
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  })
  return NextResponse.json({ user })
}
