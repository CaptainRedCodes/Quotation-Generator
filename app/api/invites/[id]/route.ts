import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'

const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) {
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

      // First, find the user by email to get their ID
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      })

      let userId = ''
      if (listRes.ok) {
        const { users } = await listRes.json()
        const user = users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === invite.email.toLowerCase()
        )
        if (user) userId = user.id
      }

      const tempPassword = generateTempPassword()

      if (userId) {
        // Update existing user's password and re-set mustChangePassword
        const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            password: tempPassword,
            user_metadata: {
              mustChangePassword: true,
            },
          }),
        })

        if (!updateRes.ok) {
          const err = await updateRes.text()
          console.error('Supabase update password error:', err)
          return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
        }
      }

      const loginUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/login'

      // Send email with new credentials
      try {
        await sendEmail({
          to: invite.email,
          subject: `Your login credentials for ${invite.organization.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Your login credentials for ${invite.organization.name}</h2>
              <p style="color: #555; line-height: 1.6;">
                Here are your updated login credentials:
              </p>
              <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #333;"><strong>Email:</strong> ${invite.email}</p>
                <p style="margin: 0; color: #333;"><strong>Temporary Password:</strong></p>
                <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 18px; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6; display: inline-block; letter-spacing: 1px;">${tempPassword}</p>
              </div>
              <p style="color: #555; line-height: 1.6;">
                <strong>Important:</strong> You will be asked to change your password when you first sign in.
              </p>
              <p style="margin: 24px 0;">
                <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">Sign In</a>
              </p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('Failed to send resend invite email:', emailError)
      }

      await db.invite.update({
        where: { id: inviteId },
        data: { updatedAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        message: 'Invite resent successfully',
        email: invite.email,
        tempPassword,
      })
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
