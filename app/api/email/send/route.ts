import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { generatePDF } from '@/lib/pdf'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import { sendEmailSchema } from '@/lib/validators'
import { APP_CONFIG } from '@/lib/constants'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Validate request body
    const validation = sendEmailSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { quotationId, to, cc, subject, message } = validation.data

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

    const defaultSubject = `Quotation ${quotation.quotationNo} from ${settings.companyName}`
    
    const defaultMessage = `Dear ${quotation.toCompanyName},

Please find attached the quotation ${quotation.quotationNo} dated ${formatDate(quotation.date)} for your reference.

Subtotal: ₹${formatIndianCurrency(quotation.subtotal)}
GST (${APP_CONFIG.defaultGstPercent}%): ₹${formatIndianCurrency(quotation.gstAmount)}
Total: ₹${formatIndianCurrency(quotation.totalAmount)}

Please feel free to reach out for any queries.

Warm regards,
${session.user?.name || 'Admin'}
${settings.companyName}`

    const emailHtml = (message || defaultMessage).replace(/\n/g, '<br>')

    const data = await resend.emails.send({
      from: settings.emailFrom || "onboarding@resend.dev",
      to,
      cc: cc || undefined,
      subject: subject || defaultSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${emailHtml}</pre>
        </div>
      `,
      attachments: [
        {
          filename: `quotation-${quotation.quotationNo}.pdf`,
          content: pdfBuffer
        }
      ]
    })

    if (data.error) {
      console.error('Resend API error:', data.error)
      return NextResponse.json({ error: data.error.message || 'Failed to send email' }, { status: 400 })
    }

    await db.quotation.update({
      where: { id: quotationId },
      data: { status: 'sent' }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
