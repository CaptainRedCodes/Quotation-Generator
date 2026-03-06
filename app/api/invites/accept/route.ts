import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isAuthError } from '@/lib/authorization'

export async function POST(request: Request) {
    try {
        const authResult = await requireAuth()
        if (isAuthError(authResult)) return authResult

        // Find any pending invites for this logged-in user's email
        const pendingInvites = await db.invite.findMany({
            where: {
                email: authResult.email,
                status: 'pending',
            },
        })

        if (pendingInvites.length > 0) {
            // Mark them all as accepted
            await db.invite.updateMany({
                where: {
                    email: authResult.email,
                    status: 'pending',
                },
                data: {
                    status: 'accepted',
                },
            })
        }

        return NextResponse.json({ success: true, updated: pendingInvites.length })
    } catch (error) {
        console.error('Accept invite error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
