import PDFDocument from 'pdfkit'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import { APP_CONFIG, PDF_CONFIG, COLUMNS, FONT_SIZES } from '@/lib/constants'
import path from 'path'

// ── amountToWords (fixed: handles hundreds correctly) ──────────────────────
const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
]
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertLessThanOneThousand(num: number): string {
  if (num === 0) return ''
  if (num < 20) return ones[num]
  if (num < 100) {
    const t = Math.floor(num / 10)
    const o = num % 10
    return tens[t] + (o ? ' ' + ones[o] : '')
  }
  // hundreds
  const h    = Math.floor(num / 100)
  const rest = num % 100
  return ones[h] + ' Hundred' + (rest ? ' ' + convertLessThanOneThousand(rest) : '')
}

function amountToWords(amount: number): string {
  const rupees = Math.floor(amount)
  const paise  = Math.round((amount - rupees) * 100)

  if (rupees === 0 && paise === 0) return 'INDIAN RUPEES Zero Only'

  const crores    = Math.floor(rupees / 10000000)
  const lakhs     = Math.floor((rupees % 10000000) / 100000)
  const thousands = Math.floor((rupees % 100000) / 1000)
  const remaining = rupees % 1000

  let words = ''
  if (crores    > 0) words += convertLessThanOneThousand(crores)    + ' Crore '
  if (lakhs     > 0) words += convertLessThanOneThousand(lakhs)     + ' Lakh '
  if (thousands > 0) words += convertLessThanOneThousand(thousands) + ' Thousand '
  if (remaining > 0) words += convertLessThanOneThousand(remaining)

  let result = 'INDIAN RUPEES ' + words.trim()
  if (paise > 0) result += ' and ' + convertLessThanOneThousand(paise) + ' Paise'
  result += ' Only'
  return result
}

// ── Interfaces ─────────────────────────────────────────────────────────────
interface QuotationData {
  quotationNo: string
  date: Date
  toCompanyName: string
  toAddress: string
  toGstNo: string | null
  toPhone: string | null
  toEmail: string | null
  subtotal: number
  discountType?: string | null
  discountValue?: number | null
  discountAmount?: number | null
  gstPercent?: number
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
  cinNo: string | null
  msmeNo: string | null
  signatureImageUrl: string | null
}

const DEFAULT_LOGO = 'logo.png'

// ── Layout constants ────────────────────────────────────────────────────────
const PAGE_LEFT = PDF_CONFIG.pageLeft
const PAGE_RIGHT = PDF_CONFIG.pageRight
const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT

const COL_SAC = COLUMNS.sac
const COL_QTY = COLUMNS.qty
const COL_UNIT = COLUMNS.unit
const COL_AMT = COLUMNS.amt
const COL_AMT_RIGHT = PAGE_RIGHT

function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).stroke()
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function generatePDF(
  quotation: QuotationData,
  company: CompanySettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data',  (chunk) => chunks.push(chunk))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = 20

    // ── TITLE ──────────────────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold')
      .text('QUOTATION', PAGE_LEFT, y, { width: PAGE_WIDTH, align: 'center' })
    y += 20

    // ── COMPANY HEADER BOX ─────────────────────────────────────────────────
    const headerH  = company.cinNo || company.msmeNo ? 65 : 55
    const logoRight = PAGE_LEFT + 100
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, headerH).stroke()
    doc.rect(PAGE_LEFT, y, 100, headerH).stroke()  // logo area

    // Logo from public folder
    try {
      const logoPath = path.join(process.cwd(), "public", company.signatureImageUrl || DEFAULT_LOGO)
      doc.image(logoPath, PAGE_LEFT + 5, y + 5, { fit: [90, 45] })
    } catch {
      doc.fontSize(7).font("Helvetica").fillColor("#bbbbbb").text("LOGO", PAGE_LEFT + 35, y + 22)
      doc.fillColor("#000000")
    }

    // Company name
    doc.fontSize(10).font('Helvetica-Bold')
      .text(company.companyName, logoRight + 8, y + 5, { width: PAGE_WIDTH - 118 })

    // Address — natural wrap, no comma splitting
    doc.fontSize(7).font('Helvetica')
      .text(company.address, logoRight + 8, y + 18, { width: PAGE_WIDTH - 118 })

    // GST / PAN pinned near bottom of header box
    let taxInfo = `GST No. ${company.gstNo}   |   PAN: ${company.panNo}`
    if (company.cinNo) taxInfo += `   |   CIN: ${company.cinNo}`
    if (company.msmeNo) taxInfo += `   |   MSME: ${company.msmeNo}`
    
    doc.fontSize(7).font('Helvetica')
      .text(taxInfo,
        logoRight + 8, y + headerH - 12, { width: PAGE_WIDTH - 118 })

    y += headerH

    // ── TO / DATE BOX ──────────────────────────────────────────────────────
    const toBoxRight = PAGE_LEFT + Math.floor(PAGE_WIDTH * 0.55)
    const toDateH    = 70

    doc.rect(PAGE_LEFT,  y, toBoxRight - PAGE_LEFT,  toDateH).stroke()
    doc.rect(toBoxRight, y, PAGE_RIGHT - toBoxRight, toDateH).stroke()

    // TO content
    let toY = y + 5
    doc.fontSize(8).font('Helvetica-Bold').text('TO', PAGE_LEFT + 6, toY)
    toY += 10
    doc.fontSize(8).font('Helvetica-Bold')
      .text(`M/S. ${quotation.toCompanyName}`, PAGE_LEFT + 6, toY, {
        width: toBoxRight - PAGE_LEFT - 12
      })
    toY += 10

    // Client address — natural wrap
    doc.fontSize(7).font('Helvetica')
      .text(quotation.toAddress, PAGE_LEFT + 6, toY, { width: toBoxRight - PAGE_LEFT - 12 })
    toY += doc.fontSize(7).font('Helvetica')
      .heightOfString(quotation.toAddress, { width: toBoxRight - PAGE_LEFT - 12 }) + 3

    if (quotation.toGstNo) {
      doc.fontSize(7).font('Helvetica')
        .text(`GST No: ${quotation.toGstNo}`, PAGE_LEFT + 6, toY, {
          width: toBoxRight - PAGE_LEFT - 12
        })
      toY += 8
    }
    if (quotation.toPhone) {
      doc.fontSize(7).font('Helvetica')
        .text(`Phone: ${quotation.toPhone}`, PAGE_LEFT + 6, toY, {
          width: toBoxRight - PAGE_LEFT - 12
        })
    }

    // Date / quotation number - swapped
    const dX  = toBoxRight + 6
    const dVX = toBoxRight + 90
    let dtY   = y + 20

    doc.fontSize(8).font('Helvetica-Bold').text('QUOTATION NO :', dX, dtY)
    doc.fontSize(8).font('Helvetica-Bold').text(quotation.quotationNo, dVX, dtY)
    dtY += 15
    doc.fontSize(8).font('Helvetica-Bold').text('DATE :', dX, dtY)
    doc.fontSize(8).font('Helvetica-Bold').text(formatDate(quotation.date), dVX, dtY)

    y += toDateH

    // ── TABLE HEADER ───────────────────────────────────────────────────────
    const tableHeaderH = 18
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, tableHeaderH).stroke()
    vLine(doc, COL_SAC,  y, y + tableHeaderH)
    vLine(doc, COL_QTY,  y, y + tableHeaderH)
    vLine(doc, COL_UNIT, y, y + tableHeaderH)
    vLine(doc, COL_AMT,  y, y + tableHeaderH)

    const hdrY = y + 5
    doc.fontSize(8).font('Helvetica-Bold')
    doc.text('PARTICULARS', PAGE_LEFT + 6, hdrY, { width: COL_SAC  - PAGE_LEFT - 10 })
    doc.text('HSN/SAC',   COL_SAC  + 4,  hdrY, { width: COL_QTY  - COL_SAC   - 6, align: 'center' })
    doc.text('Qty',       COL_QTY  + 4,  hdrY, { width: COL_UNIT - COL_QTY   - 6, align: 'center' })
    doc.text('Unit Price',COL_UNIT + 4,  hdrY, { width: COL_AMT  - COL_UNIT  - 6, align: 'right'  })
    doc.text('Amount',    COL_AMT  + 4,  hdrY, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })

    y += tableHeaderH

    // ── TABLE ROWS ─────────────────────────────────────────────────────────
    type RowData = {
      text: string; sac: string; qty: string
      unit: string; amt: string; isHeader: boolean
    }

    const itemRows: RowData[] = quotation.items.map((item) => {
      if (item.isProductHeader) {
        return { text: item.componentName, sac: '', qty: '', unit: '', amt: '', isHeader: true }
      }
      return {
        text:     item.componentName,
        sac:      item.sacCode || '',
        qty:      item.quantity  > 0 ? item.quantity.toString()              : '',
        unit:     item.unitPrice > 0 ? formatIndianCurrency(item.unitPrice)  : '',
        amt:      item.totalPrice > 0 ? formatIndianCurrency(item.totalPrice) : '',
        isHeader: false
      }
    })

    const particColW = COL_SAC - PAGE_LEFT - 12

    const rowHeights: number[] = itemRows.map((row) => {
      if (row.isHeader) return 14
      const textH = doc.fontSize(8).font('Helvetica')
        .heightOfString(row.text, { width: particColW })
      return Math.max(12, textH + 4)
    })

    const totalItemsH = rowHeights.reduce((a, b) => a + b, 0)
    const rowStartY   = y

    // Vertical column borders for entire items block
    vLine(doc, PAGE_LEFT,  rowStartY, rowStartY + totalItemsH)
    vLine(doc, PAGE_RIGHT, rowStartY, rowStartY + totalItemsH)
    vLine(doc, COL_SAC,    rowStartY, rowStartY + totalItemsH)
    vLine(doc, COL_QTY,    rowStartY, rowStartY + totalItemsH)
    vLine(doc, COL_UNIT,   rowStartY, rowStartY + totalItemsH)
    vLine(doc, COL_AMT,    rowStartY, rowStartY + totalItemsH)

    let rowY = rowStartY
    itemRows.forEach((row, i) => {
      const rh = rowHeights[i]
      const showPrice = !row.isHeader

      if (row.isHeader) {
        doc.fontSize(8).font('Helvetica-Bold')
          .text(row.text, PAGE_LEFT + 6, rowY + 3, { width: particColW })
      } else {
        doc.fontSize(7).font('Helvetica')
          .text(row.text, PAGE_LEFT + 6, rowY + 2, { width: particColW })
        if (showPrice && row.sac)
          doc.text(row.sac,  COL_SAC  + 4, rowY + 2, { width: COL_QTY  - COL_SAC  - 6, align: 'center' })
        if (showPrice && row.qty)
          doc.text(row.qty,  COL_QTY  + 4, rowY + 2, { width: COL_UNIT - COL_QTY  - 6, align: 'center' })
        if (showPrice && row.unit)
          doc.text(row.unit, COL_UNIT + 4, rowY + 2, { width: COL_AMT  - COL_UNIT - 6, align: 'right'  })
        if (showPrice && row.amt)
          doc.text(row.amt,  COL_AMT  + 4, rowY + 2, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })
      }

      rowY += rh
    })

    y = rowStartY + totalItemsH

    // ── GST ROW ────────────────────────────────────────────────────────────
    const hasDiscount = quotation.discountAmount && quotation.discountAmount > 0
    const gstRowH = PDF_CONFIG.gstRowHeight
    const gstPercent = quotation.gstPercent ?? APP_CONFIG.defaultGstPercent
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, gstRowH).stroke()
    vLine(doc, COL_AMT, y, y + gstRowH)

    doc.fontSize(FONT_SIZES.gst).font('Helvetica-Bold')
      .text(`GST @ ${gstPercent}%`, PAGE_LEFT + 6, y + 3, { width: COL_AMT - PAGE_LEFT - 10 })
    doc.fontSize(FONT_SIZES.gst).font('Helvetica')
      .text(formatIndianCurrency(quotation.gstAmount), COL_AMT + 4, y + 3, {
        width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
      })

    y += gstRowH

    // ── DISCOUNT ROW ────────────────────────────────────────────────────
    if (hasDiscount) {
      const discountRowH = 14
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, discountRowH).stroke()
      vLine(doc, COL_AMT, y, y + discountRowH)

      const discountLabel = quotation.discountType === 'percentage'
        ? `Discount (${quotation.discountValue}%)`
        : 'Discount'
      
      doc.fontSize(8).font('Helvetica-Bold')
        .text(discountLabel, PAGE_LEFT + 6, y + 3, { width: COL_AMT - PAGE_LEFT - 10 })
      doc.fontSize(8).font('Helvetica')
        .text(`-${formatIndianCurrency(quotation.discountAmount!)}`, COL_AMT + 4, y + 3, {
          width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
        })

      y += discountRowH
    }

    // ── TOTAL ROW ──────────────────────────────────────────────────────────
    const totalRowH = 14
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, totalRowH).stroke()
    vLine(doc, COL_AMT, y, y + totalRowH)

    doc.fontSize(9).font('Helvetica-Bold')
      .text('Total Payable Amount (in Figures)', PAGE_LEFT + 6, y + 3, {
        width: COL_AMT - PAGE_LEFT - 10
      })
    doc.fontSize(9).font('Helvetica-Bold')
      .text(formatIndianCurrency(quotation.totalAmount), COL_AMT + 4, y + 3, {
        width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
      })

    y += totalRowH

    // ── AMOUNT IN WORDS ────────────────────────────────────────────────────
    const wordsText = `Total Amount Payable (in Words)   ${amountToWords(quotation.totalAmount)}`
    const wordsH    = Math.max(18,
      doc.fontSize(7.5).font('Helvetica').heightOfString(wordsText, { width: PAGE_WIDTH - 14 }) + 8
    )
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, wordsH).stroke()
    doc.fontSize(7.5).font('Helvetica')
      .text(wordsText, PAGE_LEFT + 6, y + 4, { width: PAGE_WIDTH - 14 })

    y += wordsH

    // ── TERMS & CONDITIONS ─────────────────────────────────────────────────
    if (quotation.termsConditions) {
      const termsLines  = quotation.termsConditions.split('\n').filter((l) => l.trim())
      const termsHeight = 15 + termsLines.length * 12 + 4
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, termsHeight).stroke()

      doc.fontSize(8).font('Helvetica-Bold')
        .text('TERMS & CONDITIONS:', PAGE_LEFT + 6, y + 4)
      let tY = y + 16
      termsLines.forEach((line, i) => {
        const clean = line.replace(/^\d+[\.\)]\s*/, '')
        doc.fontSize(7).font('Helvetica')
          .text(`${i + 1}.  ${clean}`, PAGE_LEFT + 10, tY, { width: PAGE_WIDTH - 20 })
        tY += 12
      })

      y += termsHeight
    }

    // ── SIGNATURE ROW ──────────────────────────────────────────────────────
    const sigRowH = 50
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, sigRowH).stroke()

    doc.fontSize(8).font('Helvetica-Bold')
      .text(`For  ${company.companyName}`, PAGE_LEFT, y + 6, {
        width: PAGE_WIDTH - 10, align: 'right'
      })
    doc.fontSize(8).font('Helvetica-Bold')
      .text('Authorised Signatory', PAGE_LEFT, y + sigRowH - 14, {
        width: PAGE_WIDTH - 10, align: 'right'
      })

    doc.end()
  })
}