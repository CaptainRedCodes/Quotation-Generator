import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadCompanyLogo } from '@/lib/storage'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.' }, { status: 400 })
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = `logo-${Date.now()}.${file.type.split('/')[1]}`
    
    const logoUrl = await uploadCompanyLogo(orgId, buffer, fileName, file.type)

    if (!logoUrl) {
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
    }

    const existing = await db.companySettings.findFirst({
      where: { organizationId: orgId },
    })

    let settings
    if (existing) {
      settings = await db.companySettings.update({
        where: { id: existing.id },
        data: { signatureImageUrl: logoUrl }
      })
    } else {
      settings = await db.companySettings.create({
        data: {
          organizationId: orgId,
          createdByUserId: authResult.userId,
          companyName: 'Company Name',
          address: 'Address',
          gstNo: 'GST No',
          panNo: 'PAN No',
          signatureImageUrl: logoUrl
        }
      })
    }

    return NextResponse.json({ logoUrl })
  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
  }
}
