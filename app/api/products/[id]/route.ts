import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { updateProductSchema } from '@/lib/validators'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const product = await db.product.findUnique({
    where: { id },
    include: {
      components: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  })

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(product)
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
    const validation = updateProductSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, active, components } = validation.data

    if (components && components.length > 0) {
      await db.productComponent.deleteMany({
        where: { productId: id }
      })
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        description: description || null,
        active: active !== false,
        ...(components && components.length > 0 && {
          components: {
            create: components.map((c, index) => ({
              componentName: c.componentName,
              sacCode: c.sacCode || null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              sortOrder: index
            }))
          }
        })
      },
      include: {
        components: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
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

    await db.product.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
