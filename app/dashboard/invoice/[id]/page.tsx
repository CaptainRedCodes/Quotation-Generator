'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, FileDown, ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatIndianCurrency, amountToWords, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useOrg } from '@/components/OrgContext'

interface InvoiceItem {
  id: string
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  isProductHeader: boolean
  sortOrder: number
}

interface Invoice {
  id: string
  invoiceNo: string
  invoiceDate: Date
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
  notes: string | null
  termsConditions: string | null
  items: InvoiceItem[]
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { orgFetch } = useOrg()
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      setError(null)
      const res = await orgFetch(`/api/invoices/${params.id}`)
      if (!res.ok) throw new Error('Failed to load invoice')
      const data = await res.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error loading invoice:', error)
      setError(error instanceof Error ? error.message : 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  const subtotal = invoice?.subtotal || 0
  const gstAmount = invoice?.gstAmount || 0
  const totalAmount = invoice?.totalAmount || 0
  const amountInWords = amountToWords(totalAmount)

  const handleDownloadPDF = async () => {
    if (!invoice) return
    setDownloading(true)
    try {
      const pdfRes = await orgFetch('/api/pdf/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      })

      if (!pdfRes.ok) throw new Error('Failed to generate PDF')

      const blob = await pdfRes.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoiceNo}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setError('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return
    setUpdatingStatus(true)
    setError(null)
    try {
      const res = await orgFetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          toCompanyName: invoice.toCompanyName,
          toAddress: invoice.toAddress,
          toGstNo: invoice.toGstNo,
          toPhone: invoice.toPhone,
          toEmail: invoice.toEmail,
          subtotal: invoice.subtotal,
          discountType: (invoice as any).discountType || 'percentage',
          discountValue: (invoice as any).discountValue,
          discountAmount: (invoice as any).discountAmount,
          gstPercent: invoice.gstPercent,
          gstAmount: invoice.gstAmount,
          totalAmount: invoice.totalAmount,
          status: newStatus,
          notes: (invoice as any).notes,
          termsConditions: invoice.termsConditions,
          items: invoice.items
        })
      })
      if (res.ok) {
        setInvoice({ ...invoice, status: newStatus })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setError('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invoice not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">←</Link>
            <h1 className="text-lg font-semibold">TAX Invoice</h1>
            <span className={`px-2 py-0.5 text-xs rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-700'
              : invoice.status === 'overdue' ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
              }`}>{invoice.status}</span>
          </div>
          <button onClick={handleDownloadPDF} disabled={downloading} className="px-3 py-1.5 bg-black text-white text-sm rounded-md disabled:opacity-50">
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <img src="/adisen.png" alt="Logo" className="w-16 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">ADISEN TECH PVT LTD</h2>
                  <p className="text-xs text-slate-600">
                    No.25/1, Ground Floor, Shama Rao Compound,<br />
                    (P, Kalinga Rao Road), Mission Road, Bangalore-560025
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    GST No: 29ABBCS1596E1Z6 | PAN: ABBCS1596E
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold text-slate-800">TAX INVOICE</h3>
                <p className="text-sm text-slate-600 mt-1">{invoice.invoiceNo}</p>
                <p className="text-xs text-slate-500 mt-1">Date: {formatDate(new Date(invoice.invoiceDate))}</p>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-3 mb-4">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Bill To</h4>
                  <p className="font-medium text-slate-800">{invoice.toCompanyName}</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.toAddress}</p>
                  {invoice.toGstNo && <p className="text-xs text-slate-600">GST No: {invoice.toGstNo}</p>}
                  {invoice.toPhone && <p className="text-xs text-slate-600">Phone: {invoice.toPhone}</p>}
                </div>
              </div>
            </div>

            <table className="w-full mb-4">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Particulars</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">HSN/SAC</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Unit Price</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.filter(i => i.componentName).map((item) => (
                  <tr key={item.id} className={item.isProductHeader ? 'bg-blue-50' : ''}>
                    <td className={`px-3 py-2 text-xs ${item.isProductHeader ? 'font-bold' : ''}`}>
                      {item.componentName}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {!item.isProductHeader ? item.sacCode || '-' : ''}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {!item.isProductHeader && item.quantity > 0 ? item.quantity : ''}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {item.isProductHeader ? '' : (!item.isProductHeader && item.unitPrice > 0 ? formatIndianCurrency(item.unitPrice) : '')}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium">
                      {item.isProductHeader ? '' : (!item.isProductHeader && item.totalPrice > 0 ? formatIndianCurrency(item.totalPrice) : '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-4">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">₹{formatIndianCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">GST @ {invoice.gstPercent}%</span>
                  <span className="font-medium">₹{formatIndianCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>₹{formatIndianCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-slate-50 rounded-md mb-4">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Amount in Words:</span> {amountInWords}
              </p>
            </div>

            {invoice.termsConditions && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-slate-700 mb-1">Terms & Conditions:</h4>
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.termsConditions}</p>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4 mt-8">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">Received by</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-800">For ADISEN TECH PVT LTD</p>
                  <p className="text-xs text-slate-500">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Update Payment Status</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('pending')}
              disabled={updatingStatus || invoice.status === 'pending'}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border ${invoice.status === 'pending'
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
            >
              <Clock className="w-4 h-4" />
              Pending
            </button>
            <button
              onClick={() => handleStatusChange('paid')}
              disabled={updatingStatus || invoice.status === 'paid'}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border ${invoice.status === 'paid'
                ? 'bg-green-100 border-green-300 text-green-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
            >
              <CheckCircle className="w-4 h-4" />
              Paid
            </button>
            <button
              onClick={() => handleStatusChange('overdue')}
              disabled={updatingStatus || invoice.status === 'overdue'}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border ${invoice.status === 'overdue'
                ? 'bg-red-100 border-red-300 text-red-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
            >
              <XCircle className="w-4 h-4" />
              Overdue
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
