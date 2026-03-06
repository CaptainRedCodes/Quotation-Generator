import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  isAuthError,
  requireOrgAdmin,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth()
    if (isAuthError(authResult)) return authResult

    const orgId = requireOrgIdFromHeaders(request)
    if (orgId instanceof NextResponse) return orgId

    const adminCheck = await requireOrgAdmin(authResult.userId, orgId)
    if (isForbidden(adminCheck)) return adminCheck

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    if (organizationId !== orgId) {
      return NextResponse.json({ error: 'Organization ID mismatch' }, { status: 403 })
    }

    const invites = await db.invite.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('List invites error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
