import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createProductSchema } from '@/lib/validators'
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

  const products = await db.product.findMany({
    where: { organizationId: orgId },
    include: {
      components: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(products)
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
    const validation = createProductSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, active, components } = validation.data

    const product = await db.product.create({
      data: {
        organizationId: orgId,
        createdByUserId: authResult.userId,
        name,
        description: description || null,
        active: active !== false,
        components: components && components.length > 0 ? {
          create: components.map((c, index) => ({
            componentName: c.componentName,
            sacCode: c.sacCode || null,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            sortOrder: index
          }))
        } : undefined
      },
      include: {
        components: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
