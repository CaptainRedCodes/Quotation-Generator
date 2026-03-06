import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createInvoiceSchema } from '@/lib/validators'
import { Prisma } from '@prisma/client'
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

  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: Prisma.InvoiceWhereInput = { organizationId: orgId }

    if (search) {
      where.OR = [
        { toCompanyName: { contains: search, mode: 'insensitive' } },
        { invoiceNo: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.invoiceDate = {}
      if (dateFrom) {
        where.invoiceDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.invoiceDate.lte = new Date(dateTo)
      }
    }

    const orderByObj: any = {}
    orderByObj[sortBy] = sortOrder

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: orderByObj,
        include: {
          items: { orderBy: { sortOrder: 'asc' } }
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where })
    ])

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const body = await request.json()

    const validation = createInvoiceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { quotationId, invoiceNo, invoiceDate, toCompanyName, toAddress, toGstNo, toPhone, toEmail, subtotal, discountType, discountValue, discountAmount, gstType, gstPercent, gstAmount, totalAmount, status, notes, termsConditions, items } = validation.data

    const lastInvoice = await db.invoice.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    })
    const nextNo = lastInvoice ? parseInt(lastInvoice.invoiceNo.replace('INV-', '')) + 1 : 1
    const invoiceNumber = invoiceNo || `INV-${String(nextNo).padStart(4, '0')}`

    const invoice = await db.invoice.create({
      data: {
        organizationId: orgId,
        createdByUserId: authResult.userId,
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
        gstType,
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
      // Verify quotation belongs to same org before updating
      const quotation = await db.quotation.findFirst({
        where: { id: quotationId, organizationId: orgId },
      })
      if (quotation) {
        await db.quotation.update({
          where: { id: quotationId },
          data: {
            status: 'accepted',
            invoiceId: invoice.id
          }
        })
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
