import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createProductSchema } from '@/lib/validators'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const products = await db.product.findMany({
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
