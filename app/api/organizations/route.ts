import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OrgRole } from '@prisma/client'
import { requireAuth, isAuthError } from '@/lib/authorization'
import { createOrganizationSchema } from '@/lib/validators'

/**
 * GET /api/organizations
 * List all organizations the current user belongs to.
 */
export async function GET() {
    try {
        const authResult = await requireAuth()
        if (isAuthError(authResult)) return authResult

        const memberships = await db.organizationMembership.findMany({
            where: { userId: authResult.userId },
            include: {
                organization: {
                    include: {
                        memberships: {
                            select: { id: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const organizations = memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            role: m.role,
            memberCount: m.organization.memberships.length,
            createdAt: m.organization.createdAt,
        }))

        return NextResponse.json(organizations)
    } catch (error) {
        console.error('Error fetching organizations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch organizations' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/organizations
 * Create a new organization. The creator becomes ORG_ADMIN.
 */
export async function POST(request: Request) {
    const authResult = await requireAuth()
    if (isAuthError(authResult)) return authResult

    try {
        const body = await request.json()
        const validation = createOrganizationSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.flatten() },
                { status: 400 }
            )
        }

        const { name } = validation.data

        // Create org + add creator as ORG_ADMIN in a transaction
        const organization = await db.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: { name },
            })

            await tx.organizationMembership.create({
                data: {
                    userId: authResult.userId,
                    organizationId: org.id,
                    role: OrgRole.ORG_ADMIN,
                },
            })

            return org
        })

        return NextResponse.json(organization, { status: 201 })
    } catch (error) {
        console.error('Error creating organization:', error)
        return NextResponse.json(
            { error: 'Failed to create organization' },
            { status: 500 }
        )
    }
}
