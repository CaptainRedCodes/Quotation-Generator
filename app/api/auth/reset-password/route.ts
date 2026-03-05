import { NextResponse } from 'next/server'

/**
 * POST /api/auth/reset-password
 * Updates the user's password using the Supabase access token from the recovery flow.
 */
export async function POST(request: Request) {
    try {
        const { accessToken, newPassword } = await request.json()

        if (!accessToken || !newPassword) {
            return NextResponse.json(
                { error: 'Access token and new password are required' },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            )
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

        if (!supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Use the access token from recovery to update the user's password
        const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
            },
            body: JSON.stringify({ password: newPassword }),
        })

        if (!updateRes.ok) {
            const err = await updateRes.json()
            return NextResponse.json(
                { error: err.message || 'Failed to update password' },
                { status: 400 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
}
