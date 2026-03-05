import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OrgRole } from '@prisma/client'
import {
    requireAuth,
    isAuthError,
    requireOrgAdmin,
    isForbidden,
} from '@/lib/authorization'
import { addMemberSchema } from '@/lib/validators'

/**
 * GET /api/organizations/[id]/members
 * List all members of an organization. Requires ORG_ADMIN.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAuth()
    if (isAuthError(authResult)) return authResult

    const { id: orgId } = await params

    const adminCheck = await requireOrgAdmin(authResult.userId, orgId)
    if (isForbidden(adminCheck)) return adminCheck

    const memberships = await db.organizationMembership.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'asc' },
    })

    // Resolve user details from Supabase Admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const members = await Promise.all(
        memberships.map(async (m) => {
            let email = ''
            let name = ''
            try {
                const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${m.userId}`, {
                    headers: {
                        Authorization: `Bearer ${serviceRoleKey}`,
                        apikey: serviceRoleKey || '',
                    },
                })
                if (res.ok) {
                    const userData = await res.json()
                    email = userData.email || ''
                    name = userData.user_metadata?.name || userData.email || ''
                }
            } catch {
                // Fallback: leave email/name empty
            }
            return {
                id: m.id,
                userId: m.userId,
                role: m.role,
                email,
                name,
                createdAt: m.createdAt,
            }
        })
    )

    return NextResponse.json(members)
}

/**
 * POST /api/organizations/[id]/members
 * Add a member to the organization. Requires ORG_ADMIN.
 * Body: { email: string, role: 'ORG_ADMIN' | 'EMPLOYEE' }
 *
 * If the user doesn't exist in Supabase, creates a new user with a
 * random temporary password and sends a password-reset "invite" email
 * so the employee can set their own password on first login.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAuth()
    if (isAuthError(authResult)) return authResult

    const { id: orgId } = await params

    const adminCheck = await requireOrgAdmin(authResult.userId, orgId)
    if (isForbidden(adminCheck)) return adminCheck

    try {
        const body = await request.json()
        const validation = addMemberSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.flatten() },
                { status: 400 }
            )
        }

        const { email, role } = validation.data

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        // Look up existing user by email
        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
            },
        })

        if (!listRes.ok) {
            return NextResponse.json(
                { error: 'Failed to look up user' },
                { status: 500 }
            )
        }

        const { users } = await listRes.json()
        let targetUser = users?.find(
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
        )

        let isNewUser = false

        // If user doesn't exist, create them with a temp password
        if (!targetUser) {
            isNewUser = true

            // Generate a random temporary password (user will reset it)
            const tempPassword = crypto.randomUUID() + 'A1!'

            const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${serviceRoleKey}`,
                    apikey: serviceRoleKey,
                },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: {
                        name: email.split('@')[0], // default name from email prefix
                    },
                }),
            })

            if (!createRes.ok) {
                const err = await createRes.json()
                return NextResponse.json(
                    { error: err.message || 'Failed to create user account' },
                    { status: 400 }
                )
            }

            targetUser = await createRes.json()
        }

        // Check if already a member
        const existing = await db.organizationMembership.findUnique({
            where: {
                userId_organizationId: {
                    userId: targetUser.id,
                    organizationId: orgId,
                },
            },
        })

        if (existing) {
            return NextResponse.json(
                { error: 'User is already a member of this organization' },
                { status: 409 }
            )
        }

        // Create membership
        const membership = await db.organizationMembership.create({
            data: {
                userId: targetUser.id,
                organizationId: orgId,
                role: role as OrgRole,
            },
        })

        // Send password-reset email via Supabase so the user can set their own password
        // Supabase handles the email delivery via its configured email provider
        if (isNewUser) {
            try {
                const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                if (supabaseAnonKey) {
                    const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

                    await fetch(`${supabaseUrl}/auth/v1/recover`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            apikey: supabaseAnonKey,
                        },
                        body: JSON.stringify({
                            email: email.toLowerCase(),
                            redirect_to: `${siteUrl}/reset-password`,
                        }),
                    })
                }
            } catch (emailError) {
                // Log but don't fail — the user was created, just the email failed
                console.error('Failed to send invite email:', emailError)
            }
        }

        return NextResponse.json(
            {
                id: membership.id,
                userId: targetUser.id,
                email: targetUser.email,
                name: targetUser.user_metadata?.name || targetUser.email,
                role: membership.role,
                createdAt: membership.createdAt,
                invited: isNewUser,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error adding member:', error)
        return NextResponse.json(
            { error: 'Failed to add member' },
            { status: 500 }
        )
    }
}
