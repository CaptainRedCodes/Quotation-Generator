import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { generateQuotationNo } from '@/lib/utils'
import { createQuotationSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'
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

  const quotations = await db.quotation.findMany({
    where: { organizationId: orgId },
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
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

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
      where: { organizationId: orgId },
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
        organizationId: orgId,
        createdByUserId: authResult.userId,
        quotationNo,
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
