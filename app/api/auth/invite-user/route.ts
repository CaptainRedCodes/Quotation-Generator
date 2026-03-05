import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
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

    // Check for existing pending invite
    const existingInvite = await db.invite.findFirst({
      where: { email: email.toLowerCase(), organizationId, status: 'pending' }
    })

    if (existingInvite) {
      return NextResponse.json({ error: 'User already invited to this organization' }, { status: 400 })
    }

    const tempPassword = generateTempPassword()

    // Create user in Supabase with mustChangePassword flag
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
          mustChangePassword: true,
        },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      console.error('Supabase create_user error:', err)
      return NextResponse.json({ error: 'Failed to create user. They may already have an account.' }, { status: 500 })
    }

    const created = await createRes.json()
    const userId = created.id as string

    // Create org membership
    await db.organizationMembership.create({
      data: {
        userId,
        organizationId,
        role,
      },
    })

    // Create invite record
    await db.invite.create({
      data: {
        email: email.toLowerCase(),
        organizationId,
        role,
        status: 'pending',
        invitedBy: invitedBy || 'system',
      },
    })

    // Get org name for the email
    let orgName = ''
    try {
      const org = await db.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
      if (org?.name) orgName = org.name
    } catch {
      // ignore
    }

    const loginUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/login'

    // Send email with credentials
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Arinox Quote Generator <onboarding@resend.dev>',
        to: email.toLowerCase(),
        subject: `Your login credentials for ${orgName || 'Arinox Quote Generator'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to ${orgName || 'Arinox Quote Generator'}!</h2>
            <p style="color: #555; line-height: 1.6;">
              An account has been created for you. Use the credentials below to sign in:
            </p>
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Email:</strong> ${email.toLowerCase()}</p>
              <p style="margin: 0; color: #333;"><strong>Temporary Password:</strong></p>
              <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 18px; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6; display: inline-block; letter-spacing: 1px;">${tempPassword}</p>
            </div>
            <p style="color: #555; line-height: 1.6;">
              <strong>Important:</strong> You will be asked to change your password when you first sign in.
            </p>
            <p style="margin: 24px 0;">
              <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">Sign In</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you did not expect this, you can safely ignore this email.
            </p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
      // Don't fail the whole request — user was created, just email failed
    }

    return NextResponse.json({
      success: true,
      userId,
      email: email.toLowerCase(),
      organizationId,
      role,
      tempPassword,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
