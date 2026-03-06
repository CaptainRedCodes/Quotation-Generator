import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { updateQuotationSchema, updateQuotationDetailsSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

const VALID_STATUSES = ['draft', 'sent', 'accepted'] as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  const { id } = await params

  const quotation = await db.quotation.findFirst({
    where: { id, organizationId: orgId },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  })

  if (!quotation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(quotation)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const { id } = await params
    const body = await request.json()

    // Check if this is a simple details update (no items) or full update
    const isDetailsOnly = !body.items || body.items.length === 0

    // Validate request body
    const validation = isDetailsOnly
      ? updateQuotationDetailsSchema.safeParse(body)
      : updateQuotationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Verify quotation belongs to this org
    const existing = await db.quotation.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data = validation.data

    // Handle status update separately (can update status without items)
    if (data.status) {
      if (!VALID_STATUSES.includes(data.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: draft, sent, accepted' },
          { status: 400 }
        )
      }
    }

    // If items are provided, recalculate totals
    let subtotal = existing.subtotal
    let discountAmount = existing.discountAmount || 0
    let gstAmount = existing.gstAmount
    let totalAmount = existing.totalAmount

    if (!isDetailsOnly && data.items && data.items.length > 0) {
      const items = data.items
      subtotal = 0
      items.forEach((item) => {
        if (!item.isProductHeader) {
          subtotal += item.quantity * item.unitPrice
        }
      })

      const discountType = data.discountType || 'percentage'
      const discountValue = data.discountValue || 0
      discountAmount = discountType === 'percentage'
        ? subtotal * (discountValue / 100)
        : discountValue
      const afterDiscount = subtotal - discountAmount
      const gstPercent = APP_CONFIG.defaultGstPercent / 100
      gstAmount = afterDiscount * gstPercent
      totalAmount = afterDiscount + gstAmount
    }

    // Build update data
    const updateData: any = {
      toCompanyName: data.toCompanyName ?? existing.toCompanyName,
      toAddress: data.toAddress ?? existing.toAddress,
      toGstNo: data.toGstNo ?? existing.toGstNo,
      toPhone: data.toPhone ?? existing.toPhone,
      toEmail: data.toEmail ?? existing.toEmail,
      termsConditions: data.termsConditions ?? existing.termsConditions,
      subtotal,
      discountAmount,
      gstAmount,
      totalAmount,
    }

    if (data.status) {
      updateData.status = data.status
    }
    if (data.discountType) {
      updateData.discountType = data.discountType
    }
    if (data.discountValue !== undefined) {
      updateData.discountValue = data.discountValue
    }

    // Handle items update if provided
    if (!isDetailsOnly && data.items && data.items.length > 0) {
      // Delete existing items and create new ones
      await db.quotationItem.deleteMany({
        where: { quotationId: id }
      })

      updateData.items = {
        create: data.items.map((item, index) => ({
          componentName: item.componentName,
          sacCode: item.sacCode || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          isProductHeader: item.isProductHeader || false,
          sortOrder: index
        }))
      }
    }

    const quotation = await db.quotation.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error updating quotation:', error)
    return NextResponse.json({ error: 'Failed to update quotation' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const { id } = await params

    // Verify quotation belongs to this org
    const existing = await db.quotation.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.quotation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json({ error: 'Failed to delete quotation' }, { status: 500 })
  }
}
