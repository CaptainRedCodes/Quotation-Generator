import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { generateInvoicePdfSchema } from '@/lib/validators'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const settings = await db.companySettings.findFirst()

    const doc = new PDFDocument({ margin: 30 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    await new Promise<void>((resolve) => {
      doc.on('end', () => resolve())

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const contentWidth = pageWidth - 60

      doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' })
      doc.moveDown(0.3)

      const companyName = settings?.companyName || 'Company Name'
      const companyAddress = settings?.address || 'Address'
      const gstNo = settings?.gstNo || ''
      const panNo = settings?.panNo || ''
      const cinNo = settings?.cinNo || ''
      const msmeNo = settings?.msmeNo || ''

      let companyDetails = `${companyName}\n${companyAddress}`
      if (gstNo) companyDetails += `\nGST No: ${gstNo}`
      if (panNo) companyDetails += ` | PAN: ${panNo}`
      if (cinNo) companyDetails += `\nCIN: ${cinNo}`
      if (msmeNo) companyDetails += ` | MSME: ${msmeNo}`

      const headerBoxHeight = 60
      doc.rect(30, 45, contentWidth, headerBoxHeight).stroke()
      doc.fontSize(10).font('Helvetica-Bold').text(companyName, 40, 50)
      doc.font('Helvetica').fontSize(7).text(companyAddress, 40, 62)
      doc.fontSize(7).text(companyDetails, 40, 74, { width: contentWidth * 0.6 })

      doc.fontSize(10).font('Helvetica-Bold').text(`Invoice No: ${invoice.invoiceNo}`, pageWidth - 140, 50)
      doc.fontSize(10).font('Helvetica').text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, pageWidth - 140, 64)

      const toBoxY = 45 + headerBoxHeight + 3
      const toBoxHeight = 55
      doc.rect(30, toBoxY, contentWidth, toBoxHeight).stroke()
      doc.fontSize(8).font('Helvetica-Bold').text('BILL TO', 40, toBoxY + 5)
      doc.fontSize(9).font('Helvetica-Bold').text(invoice.toCompanyName, 40, toBoxY + 18)
      doc.font('Helvetica').fontSize(8).text(invoice.toAddress, 40, toBoxY + 32, { width: contentWidth * 0.5 })
      if (invoice.toGstNo) {
        doc.text(`GST No: ${invoice.toGstNo}`, 40, toBoxY + 48)
      }

      const tableStartY = toBoxY + toBoxHeight + 5
      const tableHeaderHeight = 18
      doc.rect(30, tableStartY, contentWidth, tableHeaderHeight).fillAndStroke('#f1f5f9', '#000')
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000')
      doc.text('PARTICULARS', 40, tableStartY + 4, { width: contentWidth * 0.42 })
      doc.text('HSN/SAC', 40 + contentWidth * 0.42, tableStartY + 4, { width: contentWidth * 0.12, align: 'center' })
      doc.text('Qty', 40 + contentWidth * 0.54, tableStartY + 4, { width: contentWidth * 0.08, align: 'center' })
      doc.text('Rate', 40 + contentWidth * 0.62, tableStartY + 4, { width: contentWidth * 0.18, align: 'right' })
      doc.text('Amount', 40 + contentWidth * 0.8, tableStartY + 4, { width: contentWidth * 0.2, align: 'right' })

      let currentY = tableStartY + tableHeaderHeight
      doc.font('Helvetica').fontSize(7).fillColor('#000')

      const filteredItems = invoice.items.filter(i => i.componentName)
      for (const item of filteredItems) {
        const rowHeight = item.isProductHeader ? 14 : 12
        if (currentY + rowHeight > pageHeight - 120) {
          doc.addPage()
          currentY = 30
        }

        if (item.isProductHeader) {
          doc.font('Helvetica-Bold').fontSize(8)
          doc.fillColor('#000')
          doc.rect(30, currentY, contentWidth, rowHeight).fill('#eff6ff')
        } else {
          doc.font('Helvetica').fontSize(7)
        }

        const showPrice = !item.isProductHeader

        doc.text(item.componentName, 40, currentY + 3, { width: contentWidth * 0.42 })
        doc.text(showPrice ? (item.sacCode || '-') : '', 40 + contentWidth * 0.42, currentY + 3, { width: contentWidth * 0.12, align: 'center' })
        doc.text(showPrice && item.quantity > 0 ? String(item.quantity) : '', 40 + contentWidth * 0.54, currentY + 3, { width: contentWidth * 0.08, align: 'center' })
        doc.text(showPrice && item.unitPrice > 0 ? item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '', 40 + contentWidth * 0.62, currentY + 3, { width: contentWidth * 0.18, align: 'right' })
        doc.text(showPrice && item.totalPrice > 0 ? item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '', 40 + contentWidth * 0.8, currentY + 3, { width: contentWidth * 0.2, align: 'right' })

        currentY += rowHeight
        doc.rect(30, currentY, contentWidth, 0.5).fill('#e2e8f0')
        currentY += 0.5
      }

      const totalY = currentY + 5
      const subtotalWidth = contentWidth * 0.6
      const valueWidth = contentWidth * 0.2

      doc.rect(30 + subtotalWidth, totalY, valueWidth, 16).stroke()
      doc.fontSize(8).text('Subtotal', 40 + subtotalWidth + 3, totalY + 4, { width: valueWidth - 6, align: 'left' })
      doc.text(invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 30 + subtotalWidth + valueWidth, totalY + 4, { width: valueWidth, align: 'right' })

      if (invoice.discountAmount && invoice.discountAmount > 0) {
        const discountLabel = invoice.discountType === 'percentage' 
          ? `Discount (${invoice.discountValue}%)`
          : 'Discount'
        doc.rect(30 + subtotalWidth, totalY + 16, valueWidth, 16).stroke()
        doc.fontSize(8).text(discountLabel, 40 + subtotalWidth + 3, totalY + 20, { width: valueWidth - 6, align: 'left' })
        doc.text(`-${invoice.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 30 + subtotalWidth + valueWidth, totalY + 20, { width: valueWidth, align: 'right' })
        
        doc.rect(30 + subtotalWidth, totalY + 32, valueWidth, 16).stroke()
        doc.text(`GST @ ${invoice.gstPercent}%`, 40 + subtotalWidth + 3, totalY + 36, { width: valueWidth - 6, align: 'left' })
        doc.text(invoice.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 30 + subtotalWidth + valueWidth, totalY + 36, { width: valueWidth, align: 'right' })

        const grandTotalY = totalY + 48
        doc.rect(30 + subtotalWidth, grandTotalY, valueWidth, 18).fillAndStroke('#1e3a8a', '#000')
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff')
        doc.text('TOTAL', 40 + subtotalWidth + 3, grandTotalY + 4, { width: valueWidth - 6, align: 'left' })
        doc.text(invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 30 + subtotalWidth + valueWidth, grandTotalY + 4, { width: valueWidth, align: 'right' })

        const amountWordsY = grandTotalY + 25
      } else {
        doc.rect(30 + subtotalWidth, totalY + 16, valueWidth, 16).stroke()
        doc.text(`GST @ ${invoice.gstPercent}%`, 40 + subtotalWidth + 3, totalY + 20, { width: valueWidth - 6, align: 'left' })
        doc.text(invoice.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 30 + subtotalWidth + valueWidth, totalY + 20, { width: valueWidth, align: 'right' })

        const grandTotalY = totalY + 32
        doc.rect(30 + subtotalWidth, grandTotalY, valueWidth, 18).fillAndStroke('#1e3a8a', '#000')
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff')
        doc.text('TOTAL', 40 + subtotalWidth + 3, grandTotalY + 4, { width: valueWidth - 6, align: 'left' })
        doc.text(invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 30 + subtotalWidth + valueWidth, grandTotalY + 4, { width: valueWidth, align: 'right' })

        const amountWordsY = grandTotalY + 25
      }
      doc.rect(30, amountWordsY, contentWidth, 18).stroke()
      doc.fontSize(8).font('Helvetica').fillColor('#000')
      doc.text(`Amount in Words: ${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 40, amountWordsY + 5)

      if (invoice.termsConditions) {
        const termsY = amountWordsY + 25
        doc.rect(30, termsY, contentWidth, 40).stroke()
        doc.fontSize(8).font('Helvetica-Bold').text('TERMS & CONDITIONS', 40, termsY + 5)
        doc.font('Helvetica').fontSize(7).text(invoice.termsConditions, 40, termsY + 18, { width: contentWidth - 10 })
      }

      const sigY = pageHeight - 50
      doc.rect(30, sigY, contentWidth, 40).stroke()
      doc.fontSize(8).font('Helvetica-Bold').text(`For ${companyName}`, pageWidth - 120, sigY + 5)
      doc.font('Helvetica').fontSize(8).text('Authorised Signatory', pageWidth - 120, sigY + 25)

      doc.end()
    })

    const result = Buffer.concat(chunks)
    return new NextResponse(result, {
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
