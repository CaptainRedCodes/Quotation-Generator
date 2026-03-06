// Email sending route - COMMENTED OUT (email features disabled for quotations/invoices)
// This route was used to send quotation PDFs via email using Resend.
// To re-enable, uncomment the code below and update to use the sendEmail helper from @/lib/email.

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Email sending is currently disabled. This feature will be re-enabled in a future update.' },
    { status: 503 }
  )
}

/*
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { generatePDF } from '@/lib/pdf'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import { sendEmailSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'
import {
  requireAuth,
  isAuthError,
  requireOrgEmployee,
  isForbidden,
  requireOrgIdFromHeaders,
} from '@/lib/authorization'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult

  const orgId = requireOrgIdFromHeaders(request)
  if (orgId instanceof NextResponse) return orgId

  const memberCheck = await requireOrgEmployee(authResult.userId, orgId)
  if (isForbidden(memberCheck)) return memberCheck

  try {
    const body = await request.json()

    const validation = sendEmailSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { quotationId, to, cc, subject, message } = validation.data

    const quotation = await db.quotation.findFirst({
      where: { id: quotationId, organizationId: orgId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const settings = await db.companySettings.findFirst({
      where: { organizationId: orgId },
    })

    if (!settings) {
      return NextResponse.json({ error: 'Company settings not found' }, { status: 404 })
    }

    const pdfBuffer = await generatePDF(quotation, settings)

    const defaultSubject = `Quotation ${quotation.quotationNo} from ${settings.companyName}`

    const defaultMessage = `Dear ${quotation.toCompanyName},

Please find attached the quotation ${quotation.quotationNo} dated ${formatDate(quotation.date)} for your reference.

Subtotal: ₹${formatIndianCurrency(quotation.subtotal)}
GST (${APP_CONFIG.defaultGstPercent}%): ₹${formatIndianCurrency(quotation.gstAmount)}
Total: ₹${formatIndianCurrency(quotation.totalAmount)}

Please feel free to reach out for any queries.

Warm regards,
${authResult.name || 'Admin'}
${settings.companyName}`

    const emailHtml = (message || defaultMessage).replace(/\n/g, '<br>')

    // TODO: Re-enable with sendEmail and attachment support
    // await sendEmail({
    //   to,
    //   subject: subject || defaultSubject,
    //   html: emailHtml,
    // })

    await db.quotation.update({
      where: { id: quotationId },
      data: { status: 'sent' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
*/
