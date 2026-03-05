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

const sendInviteEmail = async (email: string, tempPassword: string, orgName: string, loginUrl: string) => {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Arinox Quote Generator <onboarding@resend.dev>',
    to: email,
    subject: `You're invited to join ${orgName} on Arinox Quote Generator`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${orgName} on Arinox Quote Generator</h2>
        <p>Email: <strong>${email}</strong></p>
        <p>Login with the temporary password below. You can change it after you sign in.</p>
        <p style="margin: 12px 0; font-family: monospace; background: #f6f6f6; padding: 8px; border-radius: 6px; display: inline-block;">${tempPassword}</p>
        <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 18px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Sign in</a></p>
        <p>If you did not expect this invitation, you can ignore this email.</p>
      </div>
    `
  })
}

export async function POST(request: Request) {
  try {
    const { email, organizationId, role, invitedBy } = await request.json()

    if (!email || !organizationId || !role) {
      return NextResponse.json({ error: 'email, organizationId and role are required' }, { status: 400 })
    }

    const validRoles = ['ORG_ADMIN', 'EMPLOYEE']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const existingInvite = await db.invite.findFirst({
      where: { email: email.toLowerCase(), organizationId, status: 'pending' }
    })

    if (existingInvite) {
      return NextResponse.json({ error: 'User already invited to this organization' }, { status: 400 })
    }

    const tempPassword = generateTempPassword()

    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          organizationId,
          role,
        },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      console.error('Supabase invite create_user error:', err)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const created = await createRes.json()
    const userId = created.id as string

    await db.organizationMembership.create({
      data: {
        userId,
        organizationId,
        role,
      },
    })

    await db.invite.create({
      data: {
        email: email.toLowerCase(),
        organizationId,
        role,
        status: 'pending',
        invitedBy: invitedBy || 'system',
      },
    })

    let orgName = ''
    try {
      const org = await db.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
      if (org?.name) orgName = org.name
    } catch {
      // ignore
    }

    const loginUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/login'
    await sendInviteEmail(email.toLowerCase(), tempPassword, orgName, loginUrl)

    return NextResponse.json({ success: true, userId, email: email.toLowerCase(), organizationId, role })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
