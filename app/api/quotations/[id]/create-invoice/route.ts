import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { APP_CONFIG } from '@/lib/constants'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

export async function POST(
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
    const { invoiceNo, invoiceDate, notes } = body

    const quotation = await db.quotation.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // Check if invoice already exists
    if (quotation.invoiceId) {
      return NextResponse.json({ error: 'Invoice already created for this quotation' }, { status: 400 })
    }

    // Generate invoice number
    const lastInvoice = await db.invoice.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    })
    const nextNo = lastInvoice ? parseInt(lastInvoice.invoiceNo.replace('INV-', '')) + 1 : 1
    const invoiceNumber = invoiceNo || `INV-${String(nextNo).padStart(4, '0')}`

    // Create invoice from quotation data
    const invoice = await db.invoice.create({
      data: {
        organizationId: orgId,
        createdByUserId: authResult.userId,
        invoiceNo: invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        toCompanyName: quotation.toCompanyName,
        toAddress: quotation.toAddress,
        toGstNo: quotation.toGstNo,
        toPhone: quotation.toPhone,
        toEmail: quotation.toEmail,
        subtotal: quotation.subtotal,
        discountType: quotation.discountType,
        discountValue: quotation.discountValue,
        discountAmount: quotation.discountAmount,
        gstPercent: quotation.gstPercent || APP_CONFIG.defaultGstPercent,
        gstAmount: quotation.gstAmount,
        totalAmount: quotation.totalAmount,
        status: 'pending',
        notes: notes || null,
        termsConditions: quotation.termsConditions,
        items: {
          create: quotation.items.map((item, index) => ({
            componentName: item.componentName,
            sacCode: item.sacCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            isProductHeader: item.isProductHeader,
            sortOrder: index
          }))
        }
      },
      include: {
        items: true
      }
    })

    // Update quotation with invoice reference
    await db.quotation.update({
      where: { id },
      data: {
        status: 'accepted',
        invoiceId: invoice.id
      }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error creating invoice from quotation:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
