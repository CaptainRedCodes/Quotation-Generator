import PDFDocument from 'pdfkit'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import fs from 'fs'
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

interface InvoiceItem {
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  isProductHeader: boolean
}

interface InvoiceData {
  invoiceNo: string
  invoiceDate: Date
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
  items: InvoiceItem[]
}

interface CompanySettings {
  id?: string
  organizationId?: string
  companyName: string
  address: string
  gstNo: string
  panNo: string
  cinNo?: string | null
  msmeNo?: string | null
  logoUrl?: string | null
  signatureImageUrl?: string | null
}

// ── Layout constants ───────────────────────────────────────────────────────
const PAGE_LEFT     = 40
const PAGE_RIGHT    = 565
const PAGE_WIDTH    = PAGE_RIGHT - PAGE_LEFT  // 525

// Table columns: PARTICULARS | HSN/SAC | QTY | AMOUNT
const COL_HSN       = 330
const COL_QTY       = 400
const COL_AMT       = 455
const COL_AMT_RIGHT = PAGE_RIGHT

const ROW_H_HEADER  = 16   // product group header row
const ROW_H_ITEM    = 13   // component/item row
const ROW_H_SPACER  = 6    // blank spacer between groups
const ROW_H_FOOTER  = 16   // subtotal / gst / discount / total rows
const ROW_H_TOTAL   = 18   // final total row (slightly taller)
const MIN_TABLE_H   = 130  // minimum items-block height

// ── Helpers ────────────────────────────────────────────────────────────────
function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).stroke()
}

function hLine(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number) {
  doc.moveTo(x1, y).lineTo(x2, y).stroke()
}

function getLocalLogoPath(company: CompanySettings): string | null {
  const LOGO_CACHE_DIR = path.join(process.cwd(), 'public', 'logos')

  if (company.organizationId) {
    const orgDir = path.join(LOGO_CACHE_DIR, company.organizationId)
    if (fs.existsSync(orgDir)) {
      const files = fs.readdirSync(orgDir)
      const logoFiles = files.filter(f => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
      if (logoFiles.length > 0) return path.join(orgDir, logoFiles[0])
    }
  }

  if (company.signatureImageUrl && !company.signatureImageUrl.startsWith('http')) {
    const localPath = path.join(process.cwd(), 'public', company.signatureImageUrl)
    if (fs.existsSync(localPath)) return localPath
  }

  return null
}

// ── Display row type ───────────────────────────────────────────────────────
interface DisplayRow {
  text: string
  hsn: string
  qty: string
  amt: string
  isHeader: boolean
  isSpacer: boolean
}

/**
 * Build display rows.
 * - Product header row shows the GROUP TOTAL in the Amount column.
 * - Component rows show name + HSN + qty only (no per-line amount).
 * - Standalone items (no header) show all columns.
 * - A short spacer row follows each group.
 */
function buildRows(items: QuotationItem[] | InvoiceItem[]): DisplayRow[] {
  const rows: DisplayRow[] = []
  let i = 0

  while (i < items.length) {
    const item = items[i]

    if (item.isProductHeader) {
      // Sum components until next header
      let groupTotal = 0
      let j = i + 1
      while (j < items.length && !items[j].isProductHeader) {
        groupTotal += items[j].totalPrice
        j++
      }

      rows.push({
        text: item.componentName,
        hsn: '', qty: '',
        amt: groupTotal > 0 ? formatIndianCurrency(groupTotal) : '',
        isHeader: true, isSpacer: false
      })

      for (let k = i + 1; k < j; k++) {
        const comp = items[k]
        rows.push({
          text: comp.componentName,
          hsn:  comp.sacCode || '',
          qty:  comp.quantity > 0 ? comp.quantity.toString() : '',
          amt:  '',
          isHeader: false, isSpacer: false
        })
      }

      rows.push({ text: '', hsn: '', qty: '', amt: '', isHeader: false, isSpacer: true })
      i = j
    } else {
      rows.push({
        text: item.componentName,
        hsn:  item.sacCode || '',
        qty:  item.quantity > 0 ? item.quantity.toString() : '',
        amt:  item.totalPrice > 0 ? formatIndianCurrency(item.totalPrice) : '',
        isHeader: false, isSpacer: false
      })
      i++
    }
  }

  return rows
}

// ── Shared document builder ────────────────────────────────────────────────
/**
 * Renders a full A4 quotation/invoice PDF and returns the buffer.
 *
 * @param docType  'QUOTATION' | 'TAX INVOICE'
 * @param header   { no, date }
 * @param to       client address block
 * @param financials  { subtotal, discountType, discountValue, discountAmount, gstPercent, gstAmount, totalAmount }
 * @param items    line items
 * @param terms    terms & conditions string or null
 * @param company  sender company settings
 */
async function buildPDF(
  docType: string,
  header: { no: string; noLabel: string; date: Date | string },
  to: { companyName: string; address: string; gstNo: string | null; phone: string | null },
  financials: {
    subtotal: number
    discountType?: string | null
    discountValue?: number | null
    discountAmount?: number | null
    gstPercent?: number
    gstAmount: number
    totalAmount: number
  },
  items: QuotationItem[] | InvoiceItem[],
  terms: string | null,
  company: CompanySettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data',  c => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = 20

    // ── Title ──────────────────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold')
      .text(docType, PAGE_LEFT, y, { width: PAGE_WIDTH, align: 'center' })
    y += 24

    // ── Company header ─────────────────────────────────────────────────────
    const logoW   = 100
    const headerH = 70
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, headerH).stroke()
    vLine(doc, PAGE_LEFT + logoW, y, y + headerH)

    try {
      const logoPath = getLocalLogoPath(company)
      if (logoPath && fs.existsSync(logoPath)) {
        doc.image(fs.readFileSync(logoPath), PAGE_LEFT + 4, y + 4, { fit: [logoW - 8, headerH - 8] })
      } else {
        doc.fontSize(7).font('Helvetica').fillColor('#bbbbbb')
          .text('LOGO', PAGE_LEFT + 32, y + 28)
      }
    } catch {
      doc.fontSize(7).font('Helvetica').fillColor('#bbbbbb')
        .text('LOGO', PAGE_LEFT + 32, y + 28)
    }
    doc.fillColor('#000000')

    const cx = PAGE_LEFT + logoW + 8
    const cw = PAGE_WIDTH - logoW - 12
    doc.fontSize(10).font('Helvetica-Bold')
      .text(company.companyName, cx, y + 6, { width: cw })
    doc.fontSize(7).font('Helvetica')
      .text(company.address, cx, y + 19, { width: cw })

    let taxLine = `GST No. ${company.gstNo}   |   PAN: ${company.panNo}`
    if (company.cinNo)  taxLine += `   |   CIN: ${company.cinNo}`
    if (company.msmeNo) taxLine += `   |   MSME: ${company.msmeNo}`
    doc.fontSize(7).font('Helvetica')
      .text(taxLine, cx, y + headerH - 13, { width: cw })

    y += headerH

    // ── TO / Reference box ─────────────────────────────────────────────────
    const toRight = PAGE_LEFT + Math.floor(PAGE_WIDTH * 0.58)
    const toH     = 82

    doc.rect(PAGE_LEFT, y, toRight - PAGE_LEFT, toH).stroke()
    doc.rect(toRight,   y, PAGE_RIGHT - toRight, toH).stroke()

    // Client block
    let toY = y + 6
    doc.fontSize(8).font('Helvetica-Bold').text('TO', PAGE_LEFT + 6, toY)
    toY += 11
    doc.fontSize(8).font('Helvetica-Bold')
      .text(`M/S. ${to.companyName}`, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
    toY += 11
    doc.fontSize(7).font('Helvetica')
      .text(to.address, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
    toY += doc.heightOfString(to.address, { width: toRight - PAGE_LEFT - 12 }) + 4

    if (to.gstNo) {
      doc.fontSize(7).font('Helvetica')
        .text(`GST No: ${to.gstNo}`, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
      toY += 10
    }
    if (to.phone) {
      doc.fontSize(7).font('Helvetica')
        .text(`Phone: ${to.phone}`, PAGE_LEFT + 6, toY, { width: toRight - PAGE_LEFT - 12 })
    }

    // Reference (No / Date) block — two-column layout inside right cell
    const labelX = toRight + 8
    const valueX = toRight + 95
    const refW   = PAGE_RIGHT - valueX - 6
    let   dtY    = y + 24

    doc.fontSize(8).font('Helvetica-Bold').text(`${header.noLabel} :`, labelX, dtY)
    doc.fontSize(8).font('Helvetica-Bold').text(header.no, valueX, dtY, { width: refW })
    dtY += 18
    doc.fontSize(8).font('Helvetica-Bold').text('DATE :', labelX, dtY)
    doc.fontSize(8).font('Helvetica-Bold')
      .text(formatDate(header.date as Date), valueX, dtY, { width: refW })

    y += toH

    // ── Table header ───────────────────────────────────────────────────────
    const tHdrH = 18
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, tHdrH).stroke()
    vLine(doc, COL_HSN, y, y + tHdrH)
    vLine(doc, COL_QTY, y, y + tHdrH)
    vLine(doc, COL_AMT, y, y + tHdrH)

    doc.fontSize(8).font('Helvetica-Bold')
    doc.text('PARTICULARS', PAGE_LEFT + 6, y + 5, { width: COL_HSN - PAGE_LEFT - 10 })
    doc.text('HSN/SAC', COL_HSN + 4, y + 5, { width: COL_QTY - COL_HSN - 6, align: 'center' })
    doc.text('Qty',     COL_QTY + 4, y + 5, { width: COL_AMT - COL_QTY - 6, align: 'center' })
    doc.text('Amount',  COL_AMT + 4, y + 5, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })

    y += tHdrH

    // ── Items block ────────────────────────────────────────────────────────
    const displayRows = buildRows(items)
    const particW     = COL_HSN - PAGE_LEFT - 12

    const rowHeights = displayRows.map(row => {
      if (row.isSpacer) return ROW_H_SPACER
      if (row.isHeader) return ROW_H_HEADER
      const h = doc.fontSize(7).font('Helvetica').heightOfString(row.text || ' ', { width: particW })
      return Math.max(ROW_H_ITEM, h + 4)
    })

    const totalRowsH     = rowHeights.reduce((a, b) => a + b, 0)
    const actualTableH   = Math.max(totalRowsH, MIN_TABLE_H)
    const tableStartY    = y

    // Outer border + vertical column lines for full items block height
    doc.rect(PAGE_LEFT, tableStartY, PAGE_WIDTH, actualTableH).stroke()
    vLine(doc, COL_HSN, tableStartY, tableStartY + actualTableH)
    vLine(doc, COL_QTY, tableStartY, tableStartY + actualTableH)
    vLine(doc, COL_AMT, tableStartY, tableStartY + actualTableH)

    // Row content + horizontal dividers
    let rowY = tableStartY
    displayRows.forEach((row, i) => {
      const rh = rowHeights[i]

      if (!row.isSpacer) {
        if (row.isHeader) {
          doc.fontSize(8).font('Helvetica-Bold')
            .text(row.text, PAGE_LEFT + 6, rowY + 3, { width: particW })
          if (row.amt) {
            doc.fontSize(8).font('Helvetica-Bold')
              .text(row.amt, COL_AMT + 4, rowY + 3, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })
          }
        } else {
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
          // Standalone items (no header parent) also show amount
          if (row.amt) {
            doc.fontSize(7).font('Helvetica')
              .text(row.amt, COL_AMT + 4, rowY + 2, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })
          }
        }
        // Thin horizontal rule below each non-spacer row
        doc.save().strokeColor('#cccccc').lineWidth(0.5)
          .moveTo(PAGE_LEFT, rowY + rh).lineTo(PAGE_RIGHT, rowY + rh).stroke()
        doc.restore()
      }

      rowY += rh
    })

    y = tableStartY + actualTableH

    // ── Footer rows helper ─────────────────────────────────────────────────
    /**
     * Draws a full-width bordered footer row.
     * Left cell: label text (bold).
     * Right cell (Amount column): value text.
     * `labelBold` and `valueBold` control font weight.
     */
    function footerRow(
      label: string,
      value: string,
      h: number,
      opts: { labelBold?: boolean; valueBold?: boolean; valueColor?: string } = {}
    ) {
      const { labelBold = true, valueBold = false, valueColor = '#000000' } = opts
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, h).stroke()
      vLine(doc, COL_AMT, y, y + h)

      // Label spans from left edge to Amount column
      const labelFont = labelBold ? 'Helvetica-Bold' : 'Helvetica'
      doc.fontSize(8).font(labelFont).fillColor('#000000')
        .text(label, PAGE_LEFT + 6, y + (h - 8) / 2 + 1, { width: COL_AMT - PAGE_LEFT - 10 })

      // Value right-aligned in Amount column
      const valueFont = valueBold ? 'Helvetica-Bold' : 'Helvetica'
      doc.fontSize(8).font(valueFont).fillColor(valueColor)
        .text(value, COL_AMT + 4, y + (h - 8) / 2 + 1, { width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right' })

      doc.fillColor('#000000')
      y += h
    }

    // ── Subtotal row ───────────────────────────────────────────────────────
    footerRow('Subtotal', formatIndianCurrency(financials.subtotal), ROW_H_FOOTER)

    // ── Discount row (only when > 0) — BEFORE GST ─────────────────────────
    const hasDiscount = financials.discountAmount != null && financials.discountAmount > 0
    if (hasDiscount) {
      const dLabel = financials.discountType === 'percentage'
        ? `Discount (${financials.discountValue}%)`
        : 'Discount'
      footerRow(
        dLabel,
        `- ${formatIndianCurrency(financials.discountAmount!)}`,
        ROW_H_FOOTER,
        { valueBold: false, valueColor: '#cc0000' }
      )
    }

    // ── GST row ────────────────────────────────────────────────────────────
    const gstPct = financials.gstPercent ?? 18
    footerRow(`GST @ ${gstPct}%`, formatIndianCurrency(financials.gstAmount), ROW_H_FOOTER)

    // ── Total row (bold, slightly taller) ──────────────────────────────────
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, ROW_H_TOTAL).stroke()
    vLine(doc, COL_AMT, y, y + ROW_H_TOTAL)
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Total Payable Amount (in Figures)', PAGE_LEFT + 6, y + 4, { width: COL_AMT - PAGE_LEFT - 10 })
    doc.fontSize(9).font('Helvetica-Bold')
      .text(formatIndianCurrency(financials.totalAmount), COL_AMT + 4, y + 4, {
        width: COL_AMT_RIGHT - COL_AMT - 6, align: 'right'
      })
    y += ROW_H_TOTAL

    // ── Amount in words ────────────────────────────────────────────────────
    const wordsText = `Total Amount Payable (in Words)    ${amountToWords(financials.totalAmount)}`
    const wordsH = Math.max(20,
      doc.fontSize(7.5).font('Helvetica').heightOfString(wordsText, { width: PAGE_WIDTH - 14 }) + 10
    )
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, wordsH).stroke()
    doc.fontSize(7.5).font('Helvetica')
      .text(wordsText, PAGE_LEFT + 6, y + 6, { width: PAGE_WIDTH - 14 })
    y += wordsH

    // ── Terms & Conditions ─────────────────────────────────────────────────
    if (terms) {
      const lines  = terms.split('\n').filter(l => l.trim())
      const termsH = 18 + lines.length * 13 + 4
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, termsH).stroke()
      doc.fontSize(8).font('Helvetica-Bold')
        .text('TERMS & CONDITIONS:', PAGE_LEFT + 6, y + 6)
      let tY = y + 20
      lines.forEach((line, i) => {
        const clean = line.replace(/^\d+[\.\)]\s*/, '')
        doc.fontSize(7).font('Helvetica')
          .text(`${i + 1}.  ${clean}`, PAGE_LEFT + 10, tY, { width: PAGE_WIDTH - 22 })
        tY += 13
      })
      y += termsH
    }

    // ── Signature block ────────────────────────────────────────────────────
    const sigH = 64
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, sigH).stroke()

    doc.fontSize(8).font('Helvetica-Bold')
      .text(`For  ${company.companyName}`, PAGE_LEFT, y + 8, { width: PAGE_WIDTH - 10, align: 'right' })

    if (company.signatureImageUrl) {
      try {
        let sigPath = company.signatureImageUrl
        if (!company.signatureImageUrl.startsWith('http')) {
          sigPath = path.join(process.cwd(), 'public', company.signatureImageUrl)
        }
        if (fs.existsSync(sigPath)) {
          doc.image(fs.readFileSync(sigPath), PAGE_RIGHT - 105, y + 14, { fit: [95, 32] })
        }
      } catch { /* no signature image */ }
    }

    doc.fontSize(8).font('Helvetica-Bold')
      .text('Authorised Signatory', PAGE_LEFT, y + sigH - 16, { width: PAGE_WIDTH - 10, align: 'right' })

    doc.end()
  })
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function generatePDF(
  quotation: QuotationData,
  company: CompanySettings
): Promise<Buffer> {
  return buildPDF(
    'QUOTATION',
    { no: quotation.quotationNo, noLabel: 'QUOTATION NO', date: quotation.date },
    {
      companyName: quotation.toCompanyName,
      address:     quotation.toAddress,
      gstNo:       quotation.toGstNo,
      phone:       quotation.toPhone
    },
    {
      subtotal:       quotation.subtotal,
      discountType:   quotation.discountType,
      discountValue:  quotation.discountValue,
      discountAmount: quotation.discountAmount,
      gstPercent:     quotation.gstPercent,
      gstAmount:      quotation.gstAmount,
      totalAmount:    quotation.totalAmount
    },
    quotation.items,
    quotation.termsConditions,
    company
  )
}

export async function generateInvoicePDF(
  invoice: InvoiceData,
  company: CompanySettings
): Promise<Buffer> {
  return buildPDF(
    'TAX INVOICE',
    { no: invoice.invoiceNo, noLabel: 'INVOICE NO', date: invoice.invoiceDate },
    {
      companyName: invoice.toCompanyName,
      address:     invoice.toAddress,
      gstNo:       invoice.toGstNo,
      phone:       invoice.toPhone
    },
    {
      subtotal:       invoice.subtotal,
      discountType:   invoice.discountType,
      discountValue:  invoice.discountValue,
      discountAmount: invoice.discountAmount,
      gstPercent:     invoice.gstPercent,
      gstAmount:      invoice.gstAmount,
      totalAmount:    invoice.totalAmount
    },
    invoice.items,
    invoice.termsConditions,
    company
  )
} 