import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createInvoiceSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { sortOrder: 'asc' } }
      }
    })
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const validation = createInvoiceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { quotationId, invoiceNo, invoiceDate, toCompanyName, toAddress, toGstNo, toPhone, toEmail, subtotal, discountType, discountValue, discountAmount, gstPercent, gstAmount, totalAmount, status, notes, termsConditions, items } = validation.data

    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    const nextNo = lastInvoice ? parseInt(lastInvoice.invoiceNo.replace('INV-', '')) + 1 : 1
    const invoiceNumber = invoiceNo || `INV-${String(nextNo).padStart(4, '0')}`

    const invoice = await db.invoice.create({
      data: {
        invoiceNo: invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        toCompanyName,
        toAddress,
        toGstNo,
        toPhone,
        toEmail,
        subtotal,
        discountType: discountType || 'percentage',
        discountValue,
        discountAmount,
        gstPercent,
        gstAmount,
        totalAmount,
        status: status || 'pending',
        notes,
        termsConditions,
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
      },
      include: {
        items: true
      }
    })

    if (quotationId) {
      await db.quotation.update({
        where: { id: quotationId },
        data: { 
          status: 'approved',
          invoiceId: invoice.id
        }
      })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
