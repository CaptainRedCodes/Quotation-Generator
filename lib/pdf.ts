import PDFDocument from 'pdfkit'
import { formatIndianCurrency, formatDate, amountToWords } from '@/lib/utils'

interface QuotationData {
  quotationNo: string
  date: Date
  toCompanyName: string
  toAddress: string
  toGstNo: string | null
  toPhone: string | null
  toEmail: string | null
  subtotal: number
  gstPercent: number
  gstAmount: number
  totalAmount: number
  termsConditions: string | null
  items: {
    componentName: string
    sacCode: string | null
    quantity: number
    unitPrice: number
    totalPrice: number
    isProductHeader: boolean
  }[]
}

interface CompanySettings {
  companyName: string
  address: string
  gstNo: string
  panNo: string
}

export async function generatePDF(quotation: QuotationData, company: CompanySettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(18).font('Helvetica-Bold').text('QUOTATION', { align: 'center' })
    doc.moveDown(2)

    const leftColX = 50
    const rightColX = 350

    doc.fontSize(10).font('Helvetica-Bold').text(company.companyName, leftColX, doc.y)
    doc.font('Helvetica').fontSize(9)
    const addressLines = company.address.split(',')
    let yPos = doc.y
    addressLines.forEach((line) => {
      doc.text(line.trim(), leftColX, yPos)
      yPos += 12
    })
    doc.text(`GST No: ${company.gstNo}`, leftColX, yPos)
    doc.text(`PAN: ${company.panNo}`, leftColX, yPos + 12)

    doc.font('Helvetica-Bold').text('TO', rightColX, 85)
    doc.font('Helvetica').text(`M/S. ${quotation.toCompanyName}`, rightColX, doc.y)
    
    const toAddressLines = quotation.toAddress.split(',')
    toAddressLines.forEach((line) => {
      doc.text(line.trim(), rightColX, doc.y)
    })
    
    if (quotation.toGstNo) {
      doc.text(`GST No: ${quotation.toGstNo}`, rightColX, doc.y)
    }
    if (quotation.toPhone) {
      doc.text(`Phone: ${quotation.toPhone}`, rightColX, doc.y)
    }

    doc.text(`QUOTATION DATE: ${formatDate(quotation.date)}`, rightColX, 140)
    doc.text(`QUOTATION NO: ${quotation.quotationNo}`, rightColX, doc.y + 12)

    doc.moveDown(3)

    const tableTop = doc.y
    const col1 = 50
    const col2 = 280
    const col3 = 340
    const col4 = 420

    doc.font('Helvetica-Bold').fontSize(9)
    doc.text('PARTICULARS', col1, tableTop)
    doc.text('SAC Codes', col2, tableTop)
    doc.text('Qty', col3, tableTop)
    doc.text('Amount', col4, tableTop)

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke()
    doc.moveTo(50, tableTop + 15).lineTo(50, tableTop + 15).stroke()

    let y = tableTop + 20

    quotation.items.forEach((item) => {
      if (item.isProductHeader) {
        doc.font('Helvetica-Bold').fontSize(10).text(item.componentName, col1, y)
        y += 18
      } else {
        doc.font('Helvetica').fontSize(9).text(item.componentName, col1, y, { width: 220 })
        doc.text(item.sacCode || '-', col2, y)
        doc.text(item.quantity.toString(), col3, y)
        doc.text(formatIndianCurrency(item.totalPrice), col4, y)
        y += 14
      }
    })

    doc.moveTo(50, y).lineTo(550, y).stroke()

    y += 10
    doc.font('Helvetica').fontSize(9)
    doc.text('GST @ 18%', col2, y)
    doc.text(formatIndianCurrency(quotation.gstAmount), col4, y)

    y += 14
    doc.moveTo(50, y).lineTo(550, y).stroke()

    y += 10
    doc.font('Helvetica-Bold').fontSize(10)
    doc.text('Total Payable Amount', col2, y)
    doc.text(formatIndianCurrency(quotation.totalAmount), col4, y)

    y += 25
    doc.font('Helvetica-Bold').fontSize(9)
    const amountInWords = amountToWords(quotation.totalAmount)
    doc.text(`Total Amount Payable (in Words): ${amountInWords}`, col1, y, { width: 500 })

    if (quotation.termsConditions) {
      y += 40
      doc.font('Helvetica-Bold').fontSize(10).text('TERMS & CONDITIONS:', col1, y)
      doc.moveDown(0.5)
      doc.font('Helvetica').fontSize(9)
      const termsLines = quotation.termsConditions.split('\n')
      termsLines.forEach((term) => {
        doc.text(term, col1, doc.y)
      })
    }

    const signY = doc.page.height - 100
    doc.text(`For ${company.companyName}`, 400, signY)
    doc.moveDown(2)
    doc.text('Authorised Signatory', 400, doc.y)

    doc.end()
  })
}
