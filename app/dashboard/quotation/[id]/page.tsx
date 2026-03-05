'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, ArrowLeft, FileDown, Trash2, Plus, Check, Mail } from 'lucide-react'
import Link from 'next/link'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/constants'
import { EmailModal } from '@/components/EmailModal'

interface QuotationItem {
  id: string
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  isProductHeader: boolean
  sortOrder: number
}

interface Quotation {
  id: string
  quotationNo: string
  date: Date
  toCompanyName: string
  toAddress: string
  toGstNo: string | null
  toPhone: string | null
  toEmail: string | null
  subtotal: number
  discountType: string | null
  discountValue: number | null
  discountAmount: number | null
  gstPercent: number
  gstAmount: number
  totalAmount: number
  status: string
  termsConditions: string | null
  items: QuotationItem[]
  invoiceId: string | null
}

export default function QuotationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [showComponents, setShowComponents] = useState(true)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') loadQuotation()
  }, [status, router])

  async function loadQuotation() {
    try {
      const res = await fetch(`/api/quotations/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setQuotation(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const createInvoice = async () => {
    if (!quotation) return
    setCreatingInvoice(true)
    try {
      const res = await fetch(`/api/quotations/${params.id}/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNo: invoiceNo || undefined })
      })
      if (res.ok) {
        const invoice = await res.json()
        router.push(`/dashboard/invoice/${invoice.id}`)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create invoice')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const downloadPDF = async () => {
    if (!quotation) return
    const res = await fetch('/api/pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotationId: quotation.id })
    })
    if (!res.ok) return alert('Failed to generate PDF')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `quotation-${quotation.quotationNo}.pdf`
    a.click()
  }

  const deleteQuotation = async () => {
    if (!quotation || !confirm('Delete this quotation?')) return
    const res = await fetch(`/api/quotations/${quotation.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard')
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!quotation) return <div className="h-screen flex items-center justify-center">Quotation not found</div>

  const gstPercent = quotation.gstPercent || APP_CONFIG.defaultGstPercent

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Quotation {quotation.quotationNo}</h1>
          <span className={`px-2 py-1 text-xs rounded ${
            quotation.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {quotation.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">Client Details</h2>
              <p className="font-medium">{quotation.toCompanyName}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.toAddress}</p>
              {quotation.toGstNo  && <p className="text-sm mt-2">GST: {quotation.toGstNo}</p>}
              {quotation.toPhone  && <p className="text-sm">Phone: {quotation.toPhone}</p>}
              {quotation.toEmail  && <p className="text-sm">Email: {quotation.toEmail}</p>}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <button
                onClick={() => setShowComponents(!showComponents)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                <span className={`transition-transform ${showComponents ? 'rotate-180' : ''}`}>▼</span>
                {showComponents ? 'Hide' : 'Show'} Items ({quotation.items.length})
              </button>

              {showComponents && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Particulars</th>
                      <th className="text-center py-2">HSN/SAC</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Unit Price</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item, i) => (
                      <tr key={i} className={`border-b ${item.isProductHeader ? 'bg-gray-50 font-semibold' : ''}`}>
                        <td className="py-2">{item.componentName}</td>
                        <td className="text-center py-2">{item.sacCode || '-'}</td>
                        <td className="text-center py-2">{item.quantity || '-'}</td>
                        <td className="text-right py-2">{item.unitPrice ? formatIndianCurrency(item.unitPrice) : '-'}</td>
                        <td className="text-right py-2">{item.totalPrice ? formatIndianCurrency(item.totalPrice) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {quotation.termsConditions && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold mb-2">Terms & Conditions</h2>
                <p className="text-sm whitespace-pre-wrap">{quotation.termsConditions}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(quotation.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{formatIndianCurrency(quotation.subtotal)}</span>
                </div>
                {quotation.discountAmount && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount{quotation.discountType === 'percentage' ? ` (${quotation.discountValue}%)` : ''}:</span>
                    <span>-₹{formatIndianCurrency(quotation.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST ({gstPercent}%):</span>
                  <span>₹{formatIndianCurrency(quotation.gstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{formatIndianCurrency(quotation.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">Actions</h2>
              <div className="space-y-2">
                {quotation.invoiceId ? (
                  <Link
                    href={`/dashboard/invoice/${quotation.invoiceId}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" /> View Invoice
                  </Link>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Invoice No (optional)"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <button
                      onClick={createInvoice}
                      disabled={creatingInvoice}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {creatingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Generate Invoice
                    </button>
                  </>
                )}

                <button
                  onClick={downloadPDF}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <FileDown className="w-4 h-4" /> Download PDF
                </button>

                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-green-600 text-green-700 rounded-md hover:bg-green-50 font-medium"
                >
                  <Mail className="w-4 h-4" /> Send Email
                </button>

                <button
                  onClick={deleteQuotation}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal — uses quotation.id directly, no savedQuotationId needed */}
      {showEmailModal && (
        <EmailModal
          quotationId={quotation.id}
          to={quotation.toEmail || ''}
          quotationNo={quotation.quotationNo}
          date={formatDate(quotation.date)}
          subtotal={quotation.subtotal}
          gst={quotation.gstAmount}
          total={quotation.totalAmount}
          userName={session?.user?.name || ''}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false)
            loadQuotation() // refresh status to 'sent'
          }}
        />
      )}
    </div>
  )
}