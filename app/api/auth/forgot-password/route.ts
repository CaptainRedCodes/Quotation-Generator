import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const tokenRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({
                email: email.toLowerCase(),
                type: 'recovery',
                redirect_to: siteUrl,
                gotrue_meta: {
                    send_email: false
                }
            }),
        })

        if (!tokenRes.ok) {
            const errText = await tokenRes.text()
            console.error('Supabase generate_link error:', errText)
            return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
        }

        const tokenData = await tokenRes.json()
        
        let token = ''
        let actionLink = tokenData.action_link || tokenData.properties?.confirmation_url
        
        if (actionLink) {
            const urlObj = new URL(actionLink)
            token = urlObj.searchParams.get('token') || ''
        }

        if (token) {
            const resetUrl = `${siteUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`

            await sendEmail({
                to: email.toLowerCase(),
                subject: 'Reset your password',
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                        <h1 style="color: #333;">Reset your password</h1>
                        <p style="color: #666; line-height: 1.6;">
                            Click the button below to reset your password:
                        </p>
                        <a href="${resetUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                            Reset Password
                        </a>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            If you didn't request a password reset, you can safely ignore this email.
                        </p>
                        <p style="color: #999; font-size: 12px; margin-top: 24px;">
                            This link will expire in 1 hour.
                        </p>
                    </div>
                `
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }
}
