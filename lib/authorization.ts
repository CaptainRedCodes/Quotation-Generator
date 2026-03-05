import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { OrgRole } from '@prisma/client'

export type AuthResult = {
  userId: string
  email: string
  name: string
}

/**
 * Require authentication — returns user info or a 401 response.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return {
    userId: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
  }
}

/** Type guard to check if requireAuth returned an error response */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Get a user's membership in a specific organization. Returns null if not a member.
 */
export async function getUserOrgMembership(userId: string, organizationId: string) {
  return db.organizationMembership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
    include: { organization: true },
  })
}

/**
 * Require the user to be an ORG_ADMIN of the specified organization.
 * Returns the membership or a 403 NextResponse.
 */
export async function requireOrgAdmin(userId: string, organizationId: string) {
  const membership = await getUserOrgMembership(userId, organizationId)
  if (!membership || membership.role !== OrgRole.ORG_ADMIN) {
    return NextResponse.json(
      { error: 'Forbidden: requires ORG_ADMIN role' },
      { status: 403 }
    )
  }
  return membership
}

/**
 * Require the user to be a member (any role) of the specified organization.
 * Returns the membership or a 403 NextResponse.
 */
export async function requireOrgMember(userId: string, organizationId: string) {
  const membership = await getUserOrgMembership(userId, organizationId)
  if (!membership) {
    return NextResponse.json(
      { error: 'Forbidden: not a member of this organization' },
      { status: 403 }
    )
  }
  return membership
}

/**
 * Require the user to be an EMPLOYEE of the specified organization.
 * ORG_ADMINs cannot access business data (quotations, invoices, products).
 */
export async function requireOrgEmployee(userId: string, organizationId: string) {
  const membership = await getUserOrgMembership(userId, organizationId)
  if (!membership) {
    return NextResponse.json(
      { error: 'Forbidden: not a member of this organization' },
      { status: 403 }
    )
  }
  if (membership.role !== OrgRole.EMPLOYEE) {
    return NextResponse.json(
      { error: 'Forbidden: admins cannot access business data' },
      { status: 403 }
    )
  }
  return membership
}

/** Type guard to check if a require* function returned an error response */
export function isForbidden<T>(result: T | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Get all organization IDs a user belongs to.
 */
export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const memberships = await db.organizationMembership.findMany({
    where: { userId },
    select: { organizationId: true },
  })
  return memberships.map((m) => m.organizationId)
}

/**
 * Extract organization ID from request headers.
 * Clients must send x-organization-id header.
 */
export function getOrgIdFromHeaders(request: Request): string | null {
  return request.headers.get('x-organization-id')
}

/**
 * Require an organization ID from request headers.
 * Returns the org ID or a 400 NextResponse.
 */
export function requireOrgIdFromHeaders(request: Request): string | NextResponse {
  const orgId = getOrgIdFromHeaders(request)
  if (!orgId) {
    return NextResponse.json(
      { error: 'Missing x-organization-id header' },
      { status: 400 }
    )
  }
  return orgId
}
