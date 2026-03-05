import { NextResponse } from 'next/server'

/**
 * POST /api/auth/forgot-password
 * Triggers Supabase's built-in password recovery flow.
 * Supabase sends the reset email via its configured email provider.
 */
export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Use Supabase's built-in recovery endpoint
        // Supabase handles sending the email via its configured email provider
        const recoverRes = await fetch(`${supabaseUrl}/auth/v1/recover`, {
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

        if (!recoverRes.ok) {
            // Don't reveal if user exists or not — always return success
            console.error('Supabase recover error:', await recoverRes.text())
        }

        // Always return success to prevent email enumeration
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }
}

