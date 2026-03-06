// Invoice PDF generation
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInvoicePdfSchema } from '@/lib/validators'
import { generateInvoicePDF } from '@/lib/pdf'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const body = await request.json()

    const validation = generateInvoicePdfSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { invoiceId } = validation.data

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const settings = await db.companySettings.findFirst({
      where: { organizationId: orgId },
    })

    if (!settings) {
      return NextResponse.json({ error: 'Company settings not found' }, { status: 404 })
    }

    const settingsWithOrgId = {
      ...settings,
      organizationId: orgId
    }

    const pdfBuffer = await generateInvoicePDF(invoice, settingsWithOrgId)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNo}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
