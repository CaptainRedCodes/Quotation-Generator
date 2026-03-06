'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, FileDown, ArrowLeft, CheckCircle, Clock, XCircle, Edit2, Save, X } from 'lucide-react'
import { formatIndianCurrency, amountToWords, formatDate } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/constants'
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
  gstType: string | null
  gstPercent: number
  gstAmount: number
  totalAmount: number
  status: string
  isConfirmed: boolean
  notes: string | null
  termsConditions: string | null
  items: InvoiceItem[]
}

interface CompanySettings {
  companyName: string | null
  address: string | null
  gstNo: string | null
  panNo: string | null
  signatureImageUrl: string | null
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
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    invoiceNo: '',
    invoiceDate: '',
    toCompanyName: '',
    toAddress: '',
    toGstNo: '',
    toPhone: '',
    toEmail: '',
    subtotal: 0,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0,
    gstType: 'igst',
    gstPercent: 18,
    gstAmount: 0,
    totalAmount: 0,
    notes: '',
    termsConditions: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      setError(null)
      const [invoiceRes, settingsRes] = await Promise.all([
        orgFetch(`/api/invoices/${params.id}`),
        orgFetch('/api/settings')
      ])

      if (!invoiceRes.ok) throw new Error('Failed to load invoice')
      const invoiceData = await invoiceRes.json()
      setInvoice(invoiceData)

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData.settings)
      }

      setEditData({
        invoiceNo: invoiceData.invoiceNo,
        invoiceDate: new Date(invoiceData.invoiceDate).toISOString().split('T')[0],
        toCompanyName: invoiceData.toCompanyName,
        toAddress: invoiceData.toAddress,
        toGstNo: invoiceData.toGstNo || '',
        toPhone: invoiceData.toPhone || '',
        toEmail: invoiceData.toEmail || '',
        subtotal: invoiceData.subtotal,
        discountType: invoiceData.discountType || 'percentage',
        discountValue: invoiceData.discountValue || 0,
        discountAmount: invoiceData.discountAmount || 0,
        gstType: invoiceData.gstType || 'igst',
        gstPercent: invoiceData.gstPercent,
        gstAmount: invoiceData.gstAmount,
        totalAmount: invoiceData.totalAmount,
        notes: invoiceData.notes || '',
        termsConditions: invoiceData.termsConditions || ''
      })
    } catch (error) {
      console.error('Error loading invoice:', error)
      setError(error instanceof Error ? error.message : 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  const subtotal = invoice?.subtotal || 0
  const discountAmount = invoice?.discountAmount || 0
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
        body: JSON.stringify({ status: newStatus })
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

  const handleConfirmInvoice = async () => {
    if (!invoice) return
    setUpdatingStatus(true)
    setError(null)
    try {
      const res = await orgFetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isConfirmed: true })
      })
      if (res.ok) {
        setInvoice({ ...invoice, isConfirmed: true })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to confirm invoice')
      }
    } catch (error) {
      console.error('Error confirming invoice:', error)
      setError('Failed to confirm invoice')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const calculateTotals = (data: typeof editData) => {
    const afterDiscount = data.discountType === 'percentage'
      ? data.subtotal - (data.subtotal * (data.discountValue / 100))
      : data.subtotal - data.discountValue
    const gst = afterDiscount * (data.gstPercent / 100)
    const total = afterDiscount + gst
    return {
      discountAmount: data.discountType === 'percentage'
        ? data.subtotal * (data.discountValue / 100)
        : data.discountValue,
      gstAmount: gst,
      totalAmount: total
    }
  }

  const handleDiscountChange = (field: string, value: string | number) => {
    const newData = { ...editData, [field]: value }
    if (field === 'discountType' || field === 'discountValue' || field === 'subtotal' || field === 'gstPercent') {
      const totals = calculateTotals(newData)
      newData.discountAmount = totals.discountAmount
      newData.gstAmount = totals.gstAmount
      newData.totalAmount = totals.totalAmount
    }
    setEditData(newData)
  }

  const handleSaveEdit = async () => {
    if (!invoice) return
    setSavingEdit(true)
    setError(null)
    try {
      const totals = calculateTotals(editData)
      const res = await orgFetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: editData.invoiceNo,
          invoiceDate: editData.invoiceDate,
          toCompanyName: editData.toCompanyName,
          toAddress: editData.toAddress,
          toGstNo: editData.toGstNo || null,
          toPhone: editData.toPhone || null,
          toEmail: editData.toEmail || null,
          subtotal: editData.subtotal,
          discountType: editData.discountType,
          discountValue: editData.discountValue,
          discountAmount: totals.discountAmount,
          gstType: editData.gstType,
          gstPercent: editData.gstPercent,
          gstAmount: totals.gstAmount,
          totalAmount: totals.totalAmount,
          notes: editData.notes || null,
          termsConditions: editData.termsConditions || null
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setInvoice(updated)
        setIsEditing(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update invoice')
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
      setError('Failed to update invoice')
    } finally {
      setSavingEdit(false)
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
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={handleDownloadPDF} disabled={downloading} className="px-3 py-1.5 bg-black text-white text-sm rounded-md disabled:opacity-50">
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
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
                {settings?.signatureImageUrl ? (
                  <img src={settings.signatureImageUrl} alt="Logo" className="w-16 h-12 object-contain" />
                ) : (
                  <div className="w-16 h-12 bg-gray-100 flex items-center justify-center text-xs text-gray-400">Logo</div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{settings?.companyName || APP_CONFIG.companyName}</h2>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">
                    {settings?.address || 'Address not set'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    GST No: {settings?.gstNo || 'N/A'} | PAN: {settings?.panNo || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold text-slate-800">TAX INVOICE</h3>
                <p className="text-sm text-slate-600 mt-1">{isEditing ? editData.invoiceNo : invoice.invoiceNo}</p>
                <p className="text-xs text-slate-500 mt-1">Date: {isEditing ? editData.invoiceDate : formatDate(new Date(invoice.invoiceDate))}</p>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-3 mb-4">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">Bill To</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editData.toCompanyName}
                        onChange={(e) => setEditData({ ...editData, toCompanyName: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                        placeholder="Company Name"
                      />
                      <textarea
                        value={editData.toAddress}
                        onChange={(e) => setEditData({ ...editData, toAddress: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        rows={2}
                        placeholder="Address"
                      />
                      <input
                        type="text"
                        value={editData.toGstNo}
                        onChange={(e) => setEditData({ ...editData, toGstNo: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="GST No"
                      />
                      <input
                        type="text"
                        value={editData.toPhone}
                        onChange={(e) => setEditData({ ...editData, toPhone: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="Phone"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-slate-800">{invoice.toCompanyName}</p>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.toAddress}</p>
                      {invoice.toGstNo && <p className="text-xs text-slate-600">GST No: {invoice.toGstNo}</p>}
                      {invoice.toPhone && <p className="text-xs text-slate-600">Phone: {invoice.toPhone}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>

            <table className="w-full mb-4">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Particulars</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">HSN/SAC</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Rate</th>
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
                      {item.isProductHeader ? formatIndianCurrency(item.totalPrice) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isEditing && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Subtotal</label>
                    <input
                      type="number"
                      value={editData.subtotal}
                      onChange={(e) => handleDiscountChange('subtotal', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Discount Type</label>
                    <select
                      value={editData.discountType}
                      onChange={(e) => handleDiscountChange('discountType', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Discount {editData.discountType === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                      value={editData.discountValue}
                      onChange={(e) => handleDiscountChange('discountValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">GST Type</label>
                    <select
                      value={editData.gstType}
                      onChange={(e) => handleDiscountChange('gstType', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded bg-white"
                    >
                      <option value="igst">IGST</option>
                      <option value="cgst_sgst">CGST + SGST</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">GST (%)</label>
                    <input
                      type="number"
                      value={editData.gstPercent}
                      onChange={(e) => handleDiscountChange('gstPercent', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mb-4">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{formatIndianCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-red-600">
                    <span>Discount</span>
                    <span>-{formatIndianCurrency(discountAmount)}</span>
                  </div>
                )}
                {invoice.gstType === 'cgst_sgst' ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">CGST @ {invoice.gstPercent / 2}%</span>
                      <span className="font-medium">{formatIndianCurrency(gstAmount / 2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">SGST @ {invoice.gstPercent / 2}%</span>
                      <span className="font-medium">{formatIndianCurrency(gstAmount / 2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">IGST @ {invoice.gstPercent}%</span>
                    <span className="font-medium">{formatIndianCurrency(gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>{formatIndianCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-slate-50 rounded-md mb-4">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Amount in Words:</span> {amountInWords}
              </p>
            </div>

            {isEditing ? (
              <div className="mb-4 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Terms & Conditions</label>
                  <textarea
                    value={editData.termsConditions}
                    onChange={(e) => setEditData({ ...editData, termsConditions: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm rounded-md hover:bg-blue-800 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            ) : (
              <>
                {invoice.notes && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-700 mb-1">Notes:</h4>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.termsConditions && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-700 mb-1">Terms & Conditions:</h4>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.termsConditions}</p>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-slate-200 pt-4 mt-8">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">Received by</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-800">For {settings?.companyName || APP_CONFIG.companyName}</p>
                  <p className="text-xs text-slate-500">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow border border-slate-200 p-6">
          {!invoice.isConfirmed && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold mb-3 text-slate-900">Confirm Invoice</h3>
              <p className="text-sm text-slate-600 mb-3">
                Please review the invoice details and confirm before sharing with the client.
              </p>
              <button
                onClick={handleConfirmInvoice}
                disabled={updatingStatus}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Invoice
              </button>
            </div>
          )}

          {invoice.isConfirmed && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Invoice Confirmed</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                This invoice has been confirmed and can be shared with the client.
              </p>
            </div>
          )}

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
