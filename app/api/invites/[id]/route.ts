import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'
  let pwd = ''
  for (let i = 0; i < 16; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}

export async function PUT(request: Request) {
  try {
    const { inviteId, action } = await request.json()

    if (!inviteId || !action) {
      return NextResponse.json({ error: 'inviteId and action are required' }, { status: 400 })
    }

    const invite = await db.invite.findUnique({
      where: { id: inviteId },
      include: { organization: true },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (action === 'resend') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      const tempPassword = generateTempPassword()

      const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${invite.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          password: tempPassword,
        }),
      })

      if (!updateRes.ok) {
        const err = await updateRes.text()
        console.error('Supabase update password error:', err)
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
      }

      const loginUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/login'

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Arinox Quote Generator <onboarding@resend.dev>',
        to: invite.email,
        subject: `You're invited to join ${invite.organization.name} on Arinox Quote Generator`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're invited to join ${invite.organization.name} on Arinox Quote Generator</h2>
            <p>Email: <strong>${invite.email}</strong></p>
            <p>Login with the temporary password below. You can change it after you sign in.</p>
            <p style="margin: 12px 0; font-family: monospace; background: #f6f6f6; padding: 8px; border-radius: 6px; display: inline-block;">${tempPassword}</p>
            <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 18px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Sign in</a></p>
            <p>If you did not expect this invitation, you can ignore this email.</p>
          </div>
        `
      })

      await db.invite.update({
        where: { id: inviteId },
        data: { updatedAt: new Date() },
      })

      return NextResponse.json({ success: true, message: 'Invite resent successfully' })
    }

    if (action === 'cancel') {
      await db.invite.update({
        where: { id: inviteId },
        data: { status: 'cancelled' },
      })

      return NextResponse.json({ success: true, message: 'Invite cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Invite action error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
