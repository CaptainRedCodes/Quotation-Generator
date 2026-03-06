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
    const {
      invoiceNo, invoiceDate,
      toCompanyName, toAddress, toGstNo, toPhone, toEmail,
      subtotal, discountType, discountValue, discountAmount,
      gstPercent, gstAmount, totalAmount, gstType,
      notes, termsConditions, items
    } = body

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

    if (quotation.invoiceId) {
      return NextResponse.json({ error: 'Invoice already created for this quotation' }, { status: 400 })
    }

    if (quotation.status === 'draft') {
      return NextResponse.json({ error: 'Cannot create invoice. Quotation must be confirmed first.' }, { status: 400 })
    }

    const lastInvoice = await db.invoice.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    })
    const nextNo = lastInvoice ? parseInt(lastInvoice.invoiceNo.replace('INV-', '')) + 1 : 1
    const invoiceNumber = invoiceNo || `INV-${String(nextNo).padStart(4, '0')}`

    const settings = await db.companySettings.findFirst({
      where: { organizationId: orgId },
    })

    const invoiceTerms = termsConditions !== undefined
      ? termsConditions
      : (settings?.invoiceTermsConditions || quotation.termsConditions || '')

    const finalSubtotal = subtotal !== undefined ? subtotal : quotation.subtotal
    const finalDiscountType = discountType || quotation.discountType || 'percentage'
    const finalDiscountValue = discountValue !== undefined ? discountValue : (quotation.discountValue || 0)
    const finalDiscountAmount = discountAmount !== undefined
      ? discountAmount
      : (finalDiscountType === 'percentage'
        ? finalSubtotal * (finalDiscountValue / 100)
        : finalDiscountValue)
    const finalGstPercent = gstPercent !== undefined ? gstPercent : (quotation.gstPercent || 18)
    const finalGstAmount = gstAmount !== undefined
      ? gstAmount
      : ((finalSubtotal - finalDiscountAmount) * (finalGstPercent / 100))
    const finalTotalAmount = totalAmount !== undefined
      ? totalAmount
      : (finalSubtotal - finalDiscountAmount + finalGstAmount)
    const finalGstType = gstType || quotation.gstType || 'igst'

    const invoice = await db.invoice.create({
      data: {
        organizationId: orgId,
        createdByUserId: authResult.userId,
        invoiceNo: invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        toCompanyName: toCompanyName !== undefined ? toCompanyName : quotation.toCompanyName,
        toAddress: toAddress !== undefined ? toAddress : quotation.toAddress,
        toGstNo: toGstNo !== undefined ? (toGstNo || null) : quotation.toGstNo,
        toPhone: toPhone !== undefined ? (toPhone || null) : quotation.toPhone,
        toEmail: toEmail !== undefined ? (toEmail || null) : quotation.toEmail,
        subtotal: finalSubtotal,
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        discountAmount: finalDiscountAmount,
        gstPercent: finalGstPercent,
        gstAmount: finalGstAmount,
        totalAmount: finalTotalAmount,
        gstType: finalGstType,
        status: 'pending',
        isConfirmed: false,
        notes: notes !== undefined ? (notes || null) : null,
        termsConditions: invoiceTerms,
        items: {
          create: items && items.length > 0
            ? items.map((item: any, index: number) => ({
              componentName: item.componentName,
              sacCode: item.sacCode || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              isProductHeader: item.isProductHeader || false,
              sortOrder: index
            }))
            : quotation.items.map((item, index) => ({
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
