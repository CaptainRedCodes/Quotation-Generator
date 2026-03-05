import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { updateSettingsSchema, changePasswordSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  const settings = await db.companySettings.findFirst({
    where: { organizationId: orgId },
  })

  return NextResponse.json({ settings })
}

export async function PUT(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const body = await request.json()

    // Validate request body
    const validation = updateSettingsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { companyName, address, gstNo, panNo, cinNo, msmeNo, termsConditions } = validation.data
    const emailFrom = validation.data.emailFrom || APP_CONFIG.defaultEmailFrom

    // Find existing settings for this org
    const existing = await db.companySettings.findFirst({
      where: { organizationId: orgId },
    })

    let settings
    if (existing) {
      settings = await db.companySettings.update({
        where: { id: existing.id },
        data: {
          companyName,
          address,
          gstNo,
          panNo,
          cinNo,
          msmeNo,
          emailFrom,
          termsConditions: termsConditions || ''
        }
      })
    } else {
      settings = await db.companySettings.create({
        data: {
          organizationId: orgId,
          createdByUserId: authResult.userId,
          companyName,
          address,
          gstNo,
          panNo,
          cinNo,
          msmeNo,
          emailFrom,
          termsConditions: termsConditions || ''
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  try {
    const body = await request.json()

    // Validate request body
    const validation = changePasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { newPassword } = validation.data

    // Update password in Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authResult.userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        password: newPassword
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
