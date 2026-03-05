import PDFDocument from 'pdfkit'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import path from 'path'

// ── amountToWords ──────────────────────────────────────────────────────────
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
  const h = Math.floor(num / 100)
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
interface QuotationItem {
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  isProductHeader: boolean
}

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
  items: QuotationItem[]
}

interface CompanySettings {
  companyName: string
  address: string
  gstNo: string
  panNo: string
  cinNo?: string | null
  msmeNo?: string | null
  signatureImageUrl?: string | null
}

// ── Layout ─────────────────────────────────────────────────────────────────
const PAGE_LEFT      = 40
const PAGE_RIGHT     = 565
const PAGE_WIDTH     = PAGE_RIGHT - PAGE_LEFT   // 525

// Columns: PARTICULARS | HSN/SAC | QTY | AMOUNT
// No Unit Price column — matches reference PDF
const COL_HSN        = 330   // HSN/SAC starts
const COL_QTY        = 400   // Qty starts
const COL_AMT        = 455   // Amount starts
const COL_AMT_RIGHT  = PAGE_RIGHT

function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).stroke()
}

// ── Build grouped rows ──────────────────────────────────────────────────────
// Each "group" = one product header + its components.
// The total amount is shown ONLY on the header row (right-aligned),
// components show qty + hsn only, no amount — exactly like the reference.
interface DisplayRow {
  text: string
  hsn: string
  qty: string
  amt: string        // only filled on product header rows
  isHeader: boolean
  isSpacer: boolean  // blank row after each group
}

function buildRows(items: QuotationItem[]): DisplayRow[] {
  const rows: DisplayRow[] = []

  // Group items: collect headers and their children
  let i = 0
  while (i < items.length) {
    const item = items[i]

    if (item.isProductHeader) {
      // Calculate group total = sum of all component totalPrices until next header
      let groupTotal = 0
      let j = i + 1
      while (j < items.length && !items[j].isProductHeader) {
        groupTotal += items[j].totalPrice
        j++
      }

      // Header row — shows group total in Amount column
      rows.push({
        text: item.componentName,
        hsn: '',
        qty: '',
        amt: groupTotal > 0 ? formatIndianCurrency(groupTotal) : '',
        isHeader: true,
        isSpacer: false
      })

      // Component rows — show qty + hsn, NO amount
      for (let k = i + 1; k < j; k++) {
        const comp = items[k]
        rows.push({
          text: comp.componentName,
          hsn: comp.sacCode || '',
          qty: comp.quantity > 0 ? comp.quantity.toString() : '',
          amt: '',   // no per-line amount
          isHeader: false,
          isSpacer: false
        })
      }

      // Blank spacer row after group (matches reference PDF spacing)
      rows.push({ text: '', hsn: '', qty: '', amt: '', isHeader: false, isSpacer: true })

      i = j
    } else {
      // Standalone item (no header) — show all columns
      rows.push({
        text: item.componentName,
        hsn: item.sacCode || '',
        qty: item.quantity > 0 ? item.quantity.toString() : '',
        amt: item.totalPrice > 0 ? formatIndianCurrency(item.totalPrice) : '',
        isHeader: false,
        isSpacer: false
      })
      i++
    }
  }

  return rows
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function generatePDF(
  quotation: QuotationData,
  company: CompanySettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data',  chunk => chunks.push(chunk))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = 20

    // ── TITLE ──────────────────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold')
      .text('QUOTATION', PAGE_LEFT, y, { width: PAGE_WIDTH, align: 'center' })
    y += 22

    // ── COMPANY HEADER BOX ─────────────────────────────────────────────────
    const logoW   = 100
    const headerH = 70
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, headerH).stroke()
    doc.rect(PAGE_LEFT, y, logoW, headerH).stroke()

    // Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', company.signatureImageUrl || 'adisen.png')
      doc.image(logoPath, PAGE_LEFT + 4, y + 4, { fit: [logoW - 8, headerH - 8] })
    } catch {
      doc.fontSize(7).font('Helvetica').fillColor('#bbbbbb')
        .text('LOGO', PAGE_LEFT + 35, y + 28)
      doc.fillColor('#000000')
    }

    const cx = PAGE_LEFT + logoW + 8
    const cw = PAGE_WIDTH - logoW - 12
    doc.fontSize(10).font('Helvetica-Bold').text(company.companyName, cx, y + 5, { width: cw })
    doc.fontSize(7).font('Helvetica').text(company.address, cx, y + 17, { width: cw })

    let taxLine = `GST No. ${company.gstNo}   |   PAN: ${company.panNo}`
    if (company.cinNo)  taxLine += `   |   CIN: ${company.cinNo}`
    if (company.msmeNo) taxLine += `   |   MSME: ${company.msmeNo}`
    doc.fontSize(7).font('Helvetica').text(taxLine, cx, y + headerH - 12, { width: cw })

    y += headerH

    // ── TO / DATE BOX ──────────────────────────────────────────────────────
    const toRight = PAGE_LEFT + Math.floor(PAGE_WIDTH * 0.58)
    const toH     = 80

    doc.rect(PAGE_LEFT,  y, toRight - PAGE_LEFT,  toH).stroke()
    doc.rect(toRight,    y, PAGE_RIGHT - toRight, toH).stroke()

    // TO section
    let toY = y + 5
    doc.fontSize(8).font('Helvetica-Bold').text('TO', PAGE_LEFT + 6, toY)
    toY += 10
    doc.fontSize(8).font('Helvetica-Bold')
      .text(`M/S. ${quotation.toCompanyName}`, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
    toY += 10
    doc.fontSize(7).font('Helvetica')
      .text(quotation.toAddress, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
    toY += doc.heightOfString(quotation.toAddress, { width: toRight - PAGE_LEFT - 12 }) + 3
    if (quotation.toGstNo) {
      doc.fontSize(7).text(`GST No: ${quotation.toGstNo}`, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
      toY += 9
    }
    if (quotation.toPhone) {
      doc.fontSize(7).text(`Phone: ${quotation.toPhone}`, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
    }

    // Date / No section
    const dLX = toRight + 6
    const dVX = toRight + 90
    let dtY = y + 22
    doc.fontSize(8).font('Helvetica-Bold').text('QUOTATION NO :', dLX, dtY)
    doc.fontSize(8).font('Helvetica-Bold').text(quotation.quotationNo, dVX, dtY)
    dtY += 16
    doc.fontSize(8).font('Helvetica-Bold').text('DATE :', dLX, dtY)
    doc.fontSize(8).font('Helvetica-Bold').text(formatDate(quotation.date), dVX, dtY)

    y += toH

    // ── TABLE HEADER ───────────────────────────────────────────────────────
    const tHdrH = 18
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, tHdrH).stroke()
    vLine(doc, COL_HSN, y, y + tHdrH)
    vLine(doc, COL_QTY, y, y + tHdrH)
    vLine(doc, COL_AMT, y, y + tHdrH)

    doc.fontSize(8).font('Helvetica-Bold')
    doc.text('PARTICULARS', PAGE_LEFT + 6, y + 5, { width: COL_HSN - PAGE_LEFT - 10 })
    doc.text('SAC Codes',   COL_HSN + 4,   y + 5, { width: COL_QTY - COL_HSN - 6, align: 'center' })
    doc.text('Qty',         COL_QTY + 4,   y + 5, { width: COL_AMT - COL_QTY - 6, align: 'center' })
    doc.text('Amount',      COL_AMT + 4,   y + 5, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })

    y += tHdrH

    // ── TABLE ROWS ─────────────────────────────────────────────────────────
    const displayRows = buildRows(quotation.items)
    const particW     = COL_HSN - PAGE_LEFT - 12

    // Pre-calculate row heights
    const rowHeights = displayRows.map(row => {
      if (row.isSpacer)  return 8
      if (row.isHeader)  return 14
      const h = doc.fontSize(7).font('Helvetica').heightOfString(row.text || ' ', { width: particW })
      return Math.max(12, h + 4)
    })

    const totalRowsH = rowHeights.reduce((a, b) => a + b, 0)
    const rowsStartY = y

    // Draw vertical borders for entire items block
    vLine(doc, PAGE_LEFT,  rowsStartY, rowsStartY + totalRowsH)
    vLine(doc, PAGE_RIGHT, rowsStartY, rowsStartY + totalRowsH)
    vLine(doc, COL_HSN,    rowsStartY, rowsStartY + totalRowsH)
    vLine(doc, COL_QTY,    rowsStartY, rowsStartY + totalRowsH)
    vLine(doc, COL_AMT,    rowsStartY, rowsStartY + totalRowsH)

    // Draw horizontal bottom border for each row
    let rowY = rowsStartY
    displayRows.forEach((row, i) => {
      const rh = rowHeights[i]

      if (!row.isSpacer) {
        if (row.isHeader) {
          // Product header: bold name + group total amount
          doc.fontSize(8).font('Helvetica-Bold')
            .text(row.text, PAGE_LEFT + 6, rowY + 2, { width: particW })
          if (row.amt) {
            doc.fontSize(8).font('Helvetica-Bold')
              .text(row.amt, COL_AMT + 4, rowY + 2, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })
          }
        } else {
          // Component row: name + hsn + qty, NO amount
          doc.fontSize(7).font('Helvetica')
            .text(row.text, PAGE_LEFT + 6, rowY + 2, { width: particW })
          if (row.hsn) {
            doc.fontSize(7).font('Helvetica')
              .text(row.hsn, COL_HSN + 4, rowY + 2, { width: COL_QTY - COL_HSN - 6, align: 'center' })
          }
          if (row.qty) {
            doc.fontSize(7).font('Helvetica')
              .text(row.qty, COL_QTY + 4, rowY + 2, { width: COL_AMT - COL_QTY - 6, align: 'center' })
          }
        }
      }

      rowY += rh
    })

    y = rowsStartY + totalRowsH

    // ── GST ROW ────────────────────────────────────────────────────────────
    const gstPercent = quotation.gstPercent ?? 18
    const gstRowH    = 16
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, gstRowH).stroke()
    vLine(doc, COL_AMT, y, y + gstRowH)
    doc.fontSize(8).font('Helvetica-Bold')
      .text(`GST @ ${gstPercent}%`, PAGE_LEFT + 6, y + 4, { width: COL_AMT - PAGE_LEFT - 10 })
    doc.fontSize(8).font('Helvetica')
      .text(formatIndianCurrency(quotation.gstAmount), COL_AMT + 4, y + 4, {
        width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
      })
    y += gstRowH

    // ── DISCOUNT ROW (optional) ─────────────────────────────────────────────
    if (quotation.discountAmount && quotation.discountAmount > 0) {
      const dRowH = 14
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, dRowH).stroke()
      vLine(doc, COL_AMT, y, y + dRowH)
      const dLabel = quotation.discountType === 'percentage'
        ? `Discount (${quotation.discountValue}%)`
        : 'Discount'
      doc.fontSize(8).font('Helvetica-Bold')
        .text(dLabel, PAGE_LEFT + 6, y + 3, { width: COL_AMT - PAGE_LEFT - 10 })
      doc.fontSize(8).font('Helvetica')
        .text(`-${formatIndianCurrency(quotation.discountAmount)}`, COL_AMT + 4, y + 3, {
          width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
        })
      y += dRowH
    }

    // ── TOTAL ROW ──────────────────────────────────────────────────────────
    const totalRowH = 16
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, totalRowH).stroke()
    vLine(doc, COL_AMT, y, y + totalRowH)
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Total Payable Amount (in Figures)', PAGE_LEFT + 6, y + 4, { width: COL_AMT - PAGE_LEFT - 10 })
    doc.fontSize(9).font('Helvetica-Bold')
      .text(formatIndianCurrency(quotation.totalAmount), COL_AMT + 4, y + 4, {
        width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
      })
    y += totalRowH

    // ── AMOUNT IN WORDS ────────────────────────────────────────────────────
    const wordsText = `Total Amount Payable (in Words)   ${amountToWords(quotation.totalAmount)}`
    const wordsH = Math.max(18,
      doc.fontSize(7.5).font('Helvetica').heightOfString(wordsText, { width: PAGE_WIDTH - 14 }) + 8
    )
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, wordsH).stroke()
    doc.fontSize(7.5).font('Helvetica')
      .text(wordsText, PAGE_LEFT + 6, y + 5, { width: PAGE_WIDTH - 14 })
    y += wordsH

    // ── TERMS & CONDITIONS ─────────────────────────────────────────────────
    if (quotation.termsConditions) {
      const lines = quotation.termsConditions.split('\n').filter(l => l.trim())
      const termsH = 16 + lines.length * 12 + 4
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, termsH).stroke()
      doc.fontSize(8).font('Helvetica-Bold').text('TERMS & CONDITIONS:', PAGE_LEFT + 6, y + 5)
      let tY = y + 17
      lines.forEach((line, i) => {
        const clean = line.replace(/^\d+[\.\)]\s*/, '')
        doc.fontSize(7).font('Helvetica')
          .text(`${i + 1}.  ${clean}`, PAGE_LEFT + 10, tY, { width: PAGE_WIDTH - 20 })
        tY += 12
      })
      y += termsH
    }

    // ── SIGNATURE ──────────────────────────────────────────────────────────
    const sigH = 60
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, sigH).stroke()

    doc.fontSize(8).font('Helvetica-Bold')
      .text(`For  ${company.companyName}`, PAGE_LEFT, y + 6, { width: PAGE_WIDTH - 10, align: 'right' })

    // Signature image if available
    if (company.signatureImageUrl) {
      try {
        const sigPath = path.join(process.cwd(), 'public', company.signatureImageUrl)
        doc.image(sigPath, PAGE_RIGHT - 100, y + 12, { fit: [90, 30] })
      } catch { /* no signature image — skip */ }
    }

    doc.fontSize(8).font('Helvetica-Bold')
      .text('Authorised Signatory', PAGE_LEFT, y + sigH - 14, { width: PAGE_WIDTH - 10, align: 'right' })

    doc.end()
  })
}