import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { token, email, newPassword } = body

        if (!token || !email || !newPassword) {
            return NextResponse.json(
                { error: 'Token, email and new password are required' },
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
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({
                token_hash: token,
                type: 'recovery',
            }),
        })

        if (!verifyRes.ok) {
            return NextResponse.json(
                { error: 'Invalid or expired recovery token' },
                { status: 400 }
            )
        }

        const verifyData = await verifyRes.json()
        const accessToken = verifyData.access_token

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Failed to verify recovery token' },
                { status: 400 }
            )
        }

        const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': supabaseAnonKey,
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
