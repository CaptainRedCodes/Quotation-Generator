import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { generatePDF } from '@/lib/pdf'
import { generatePdfSchema } from '@/lib/validators'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate request body
    const validation = generatePdfSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { quotationId } = validation.data

    const quotation = await db.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const settings = await db.companySettings.findFirst()
    
    if (!settings) {
      return NextResponse.json({ error: 'Company settings not found' }, { status: 404 })
    }

    const pdfBuffer = await generatePDF(quotation, settings)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quotation-${quotation.quotationNo}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
