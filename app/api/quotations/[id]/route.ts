import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { updateQuotationSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'

const VALID_STATUSES = ['draft', 'sent', 'accepted'] as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const quotation = await db.quotation.findUnique({
    where: { id },
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = updateQuotationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { toCompanyName, toAddress, toGstNo, toPhone, toEmail, items, termsConditions, status, quotationNo, date, discountType, discountValue } = validation.data

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: draft, sent, accepted' },
        { status: 400 }
      )
    }

    let subtotal = 0
    items.forEach((item) => {
      if (!item.isProductHeader) {
        subtotal += item.quantity * item.unitPrice
      }
    })

    const discountAmount = discountType === 'percentage' 
      ? subtotal * ((discountValue || 0) / 100) 
      : (discountValue || 0)
    const afterDiscount = subtotal - discountAmount
    const gstPercent = APP_CONFIG.defaultGstPercent / 100
    const gstAmount = afterDiscount * gstPercent
    const totalAmount = afterDiscount + gstAmount

    await db.quotationItem.deleteMany({
      where: { quotationId: id }
    })

    const quotation = await db.quotation.update({
      where: { id },
      data: {
        toCompanyName,
        toAddress,
        toGstNo: toGstNo || null,
        toPhone: toPhone || null,
        toEmail: toEmail || null,
        subtotal,
        discountType: discountType || 'percentage',
        discountValue: discountValue || null,
        discountAmount,
        gstAmount,
        totalAmount,
        termsConditions: termsConditions || '',
        status: status || 'draft',
        quotationNo: quotationNo || undefined,
        date: date ? new Date(date) : undefined,
        items: {
          create: items.map((item, index) => ({
            componentName: item.componentName,
            sacCode: item.sacCode || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            isProductHeader: item.isProductHeader || false,
            sortOrder: index
          }))
        }
      },
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    await db.quotation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json({ error: 'Failed to delete quotation' }, { status: 500 })
  }
}
