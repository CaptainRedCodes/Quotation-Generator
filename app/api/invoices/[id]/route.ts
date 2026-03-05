import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateInvoiceSchema } from '@/lib/validators'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

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

  try {
    const { id } = await params
    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
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

    // Verify invoice belongs to this org
    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const body = await request.json()

    // For status-only updates, use simpler validation
    if (body.status && Object.keys(body).length === 2 && body.status) {
      const invoice = await db.invoice.update({
        where: { id },
        data: { status: body.status }
      })
      return NextResponse.json(invoice)
    }

    const validation = updateInvoiceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { invoiceNo, invoiceDate, toCompanyName, toAddress, toGstNo, toPhone, toEmail, subtotal, discountType, discountValue, discountAmount, gstPercent, gstAmount, totalAmount, status, notes, termsConditions, items } = validation.data

    // Only delete and recreate items if items are provided
    if (items && items.length > 0) {
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } })
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        toCompanyName,
        toAddress,
        toGstNo,
        toPhone,
        toEmail,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        gstPercent,
        gstAmount,
        totalAmount,
        status,
        notes,
        termsConditions,
        ...(items && items.length > 0 ? {
          items: {
            create: items.map((item, index: number) => ({
              componentName: item.componentName,
              sacCode: item.sacCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              isProductHeader: item.isProductHeader || false,
              sortOrder: index
            }))
          }
        } : {})
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
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

    // Verify invoice belongs to this org
    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Try to clear quotation reference if it exists
    try {
      await db.quotation.updateMany({
        where: { invoiceId: id, organizationId: orgId },
        data: { invoiceId: null, status: 'sent' }
      })
    } catch {
      // Ignore if relation doesn't exist
    }

    await db.invoice.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
