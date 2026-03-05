import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { generateQuotationNo } from '@/lib/utils'
import { createQuotationSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quotations = await db.quotation.findMany({
    include: {
      items: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(quotations)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate request body
    const validation = createQuotationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { toCompanyName, toAddress, toGstNo, toPhone, toEmail, items, termsConditions } = validation.data

    const lastQuotation = await db.quotation.findFirst({
      orderBy: { quotationNo: 'desc' }
    })

    const quotationNo = generateQuotationNo(lastQuotation?.quotationNo ?? null, new Date())

    let subtotal = 0
    items.forEach((item) => {
      if (!item.isProductHeader) {
        subtotal += item.quantity * item.unitPrice
      }
    })

    const gstPercent = APP_CONFIG.defaultGstPercent / 100
    const gstAmount = subtotal * gstPercent
    const totalAmount = subtotal + gstAmount

    const quotation = await db.quotation.create({
      data: {
        quotationNo,
        createdById: session.user?.id || '',
        toCompanyName,
        toAddress,
        toGstNo: toGstNo || null,
        toPhone: toPhone || null,
        toEmail: toEmail || null,
        subtotal,
        gstPercent: APP_CONFIG.defaultGstPercent,
        gstAmount,
        totalAmount,
        termsConditions: termsConditions || '',
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
        items: true
      }
    })

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error creating quotation:', error)
    return NextResponse.json({ error: 'Failed to create quotation' }, { status: 500 })
  }
}
