import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { newPassword } = await request.json()

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            )
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Update password using Supabase Admin API
        const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${session.user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({
                password: newPassword,
                user_metadata: {
                    mustChangePassword: false,
                },
            }),
        })

        if (!updateRes.ok) {
            const err = await updateRes.json()
            console.error('Supabase update password error:', err)
            return NextResponse.json(
                { error: err.message || 'Failed to update password' },
                { status: 400 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
    }
}
