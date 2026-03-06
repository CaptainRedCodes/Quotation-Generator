import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createQuotationSchema, createQuotationDraftSchema } from '@/lib/validators'
import { generateQuotationNo } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/constants'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'
import { Prisma } from '@prisma/client'

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

    const where: Prisma.QuotationWhereInput = { organizationId: orgId }

    if (search) {
      where.OR = [
        { toCompanyName: { contains: search, mode: 'insensitive' } },
        { quotationNo: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) {
        where.date.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo)
      }
    }

    const orderByObj: any = {}
    orderByObj[sortBy] = sortOrder

    const [quotations, total] = await Promise.all([
      db.quotation.findMany({
        where,
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: orderByObj,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.quotation.count({ where })
    ])

    return NextResponse.json({
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 })
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
    const isDraft = body.isDraft === true

    let validation
    if (isDraft) {
      validation = createQuotationDraftSchema.safeParse(body)
    } else {
      validation = createQuotationSchema.safeParse(body)
    }

    if (!validation.success) {
      return NextResponse.json(
        { error: isDraft ? 'Failed to save draft' : 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { toCompanyName, toAddress, toGstNo, toPhone, toEmail, items, termsConditions, discountType, discountValue, discountAmount, gstPercent, gstAmount, subtotal, totalAmount, gstType } = validation.data

    const lastQuotation = await db.quotation.findFirst({
      where: { organizationId: orgId },
      orderBy: { quotationNo: 'desc' }
    })

    const quotationNo = generateQuotationNo(lastQuotation?.quotationNo ?? null, new Date())

    let calculatedSubtotal = 0
    if (items && items.length > 0) {
      items.forEach((item) => {
        if (!item.isProductHeader) {
          calculatedSubtotal += item.quantity * item.unitPrice
        }
      })
    }

    const finalSubtotal = subtotal !== undefined ? subtotal : calculatedSubtotal
    const finalGstPercent = gstPercent !== undefined ? gstPercent : APP_CONFIG.defaultGstPercent
    const finalDiscountType = discountType || 'percentage'
    const finalDiscountValue = discountValue || 0

    // Use provided amounts or gracefully fallback
    const finalDiscountAmount = discountAmount !== undefined ? discountAmount : (
      finalDiscountType === 'percentage'
        ? finalSubtotal * (finalDiscountValue / 100)
        : Math.min(finalDiscountValue, finalSubtotal)
    )

    const afterDiscount = finalSubtotal - finalDiscountAmount
    const finalGstAmount = gstAmount !== undefined ? gstAmount : (afterDiscount * (finalGstPercent / 100))
    const finalTotalAmount = totalAmount !== undefined ? totalAmount : (afterDiscount + finalGstAmount)

    const settings = await db.companySettings.findFirst({
      where: { organizationId: orgId },
    })

    const quotationTerms = termsConditions || settings?.quotationTermsConditions || ''

    const quotation = await db.quotation.create({
      data: {
        organizationId: orgId,
        createdByUserId: authResult.userId,
        quotationNo,
        toCompanyName: toCompanyName || '',
        toAddress: toAddress || '',
        toGstNo: toGstNo || null,
        toPhone: toPhone || null,
        toEmail: toEmail || null,
        subtotal: finalSubtotal,
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        discountAmount: finalDiscountAmount,
        gstPercent: finalGstPercent,
        gstAmount: finalGstAmount,
        totalAmount: finalTotalAmount,
        gstType: gstType || 'igst',
        termsConditions: quotationTerms,
        status: 'draft',
        items: items && items.length > 0 ? {
          create: items.map((item, index) => ({
            componentName: item.componentName,
            sacCode: item.sacCode || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            isProductHeader: item.isProductHeader || false,
            sortOrder: index
          }))
        } : undefined
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
