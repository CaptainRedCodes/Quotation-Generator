import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
    requireAuth,
    isAuthError,
    requireOrgAdmin,
    isForbidden,
} from '@/lib/authorization'

/**
 * DELETE /api/organizations/[id]/members/[userId]
 * Remove a member from the organization. Requires ORG_ADMIN.
 * Cannot remove yourself.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const authResult = await requireAuth()
    if (isAuthError(authResult)) return authResult

    const { id: orgId, userId: targetUserId } = await params

    const adminCheck = await requireOrgAdmin(authResult.userId, orgId)
    if (isForbidden(adminCheck)) return adminCheck

    // Prevent self-removal
    if (targetUserId === authResult.userId) {
        return NextResponse.json(
            { error: 'You cannot remove yourself from the organization' },
            { status: 400 }
        )
    }

    try {
        // Verify the target user is actually a member
        const membership = await db.organizationMembership.findUnique({
            where: {
                userId_organizationId: {
                    userId: targetUserId,
                    organizationId: orgId,
                },
            },
        })

        if (!membership) {
            return NextResponse.json(
                { error: 'User is not a member of this organization' },
                { status: 404 }
            )
        }

        await db.organizationMembership.delete({
            where: { id: membership.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error removing member:', error)
        return NextResponse.json(
            { error: 'Failed to remove member' },
            { status: 500 }
        )
    }
}
