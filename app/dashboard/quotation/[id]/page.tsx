'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, ArrowLeft, FileDown, Trash2, Plus, Check, Edit2, Save, X } from 'lucide-react'
import Link from 'next/link'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/constants'
import { useOrg } from '@/components/OrgContext'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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
  gstType: string
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
  const { orgFetch } = useOrg()
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [showComponents, setShowComponents] = useState(true)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [confirmingQuotation, setConfirmingQuotation] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [showEditInvoice, setShowEditInvoice] = useState(false)
  const [showConfirmInvoice, setShowConfirmInvoice] = useState(false)
  const [showConfirmQuotation, setShowConfirmQuotation] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
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
    termsConditions: '',
    items: [] as QuotationItem[]
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    toCompanyName: '',
    toAddress: '',
    toGstNo: '',
    toPhone: '',
    toEmail: '',
    date: '',
    termsConditions: '',
    gstType: 'igst',
    gstPercent: 18,
    discountType: 'percentage',
    discountValue: 0,
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // ── Item editing state ──────────────────────────────────────────────────────
  const [isEditingItems, setIsEditingItems] = useState(false)
  const [editItems, setEditItems] = useState<QuotationItem[]>([])
  const [isSavingItems, setIsSavingItems] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') loadQuotation()
  }, [status, router])

  async function loadQuotation() {
    try {
      const res = await orgFetch(`/api/quotations/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setQuotation(data)
        setEditData({
          toCompanyName: data.toCompanyName || '',
          toAddress: data.toAddress || '',
          toGstNo: data.toGstNo || '',
          toPhone: data.toPhone || '',
          toEmail: data.toEmail || '',
          date: data.date,
          termsConditions: data.termsConditions || '',
          gstType: data.gstType || 'igst',
          gstPercent: data.gstPercent || 18,
          discountType: data.discountType || 'percentage',
          discountValue: data.discountValue || 0,
        } as any)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Client detail editing ───────────────────────────────────────────────────
  const handleEditClick = () => {
    if (quotation) {
      setEditData({
        toCompanyName: quotation.toCompanyName || '',
        toAddress: quotation.toAddress || '',
        toGstNo: quotation.toGstNo || '',
        toPhone: quotation.toPhone || '',
        toEmail: quotation.toEmail || '',
        date: quotation.date,
        termsConditions: quotation.termsConditions || '',
        gstType: quotation.gstType || 'igst',
        gstPercent: quotation.gstPercent || 18,
        discountType: quotation.discountType || 'percentage',
        discountValue: quotation.discountValue || 0,
      } as any)
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (quotation) {
      setEditData({
        toCompanyName: quotation.toCompanyName || '',
        toAddress: quotation.toAddress || '',
        toGstNo: quotation.toGstNo || '',
        toPhone: quotation.toPhone || '',
        toEmail: quotation.toEmail || '',
        date: quotation.date,
        termsConditions: quotation.termsConditions || '',
        gstType: quotation.gstType || 'igst',
        gstPercent: quotation.gstPercent || 18,
        discountType: quotation.discountType || 'percentage',
        discountValue: quotation.discountValue || 0,
      } as any)
    }
  }

  const handleSaveEdit = async () => {
    if (!quotation) return
    setIsSavingEdit(true)
    try {
      // Recompute derived financials when saving details if GST or discount changed
      const subtotal = quotation.subtotal || 0
      const discountAmount = (editData as any).discountType === 'percentage'
        ? subtotal * (((editData as any).discountValue || 0) / 100)
        : Math.min(((editData as any).discountValue || 0), subtotal)
      const afterDiscount = subtotal - discountAmount
      const gstPercent = (editData as any).gstPercent || 18
      const gstAmount = afterDiscount * (gstPercent / 100)
      const totalAmount = afterDiscount + gstAmount

      const payload = {
        ...editData,
        date: (editData as any).date ? new Date((editData as any).date).toISOString() : quotation.date,
        discountAmount,
        gstAmount,
        totalAmount
      }

      const res = await orgFetch(`/api/quotations/${quotation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const updated = await res.json()
        setQuotation(updated)
        setIsEditing(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save changes')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save changes')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // ── Item editing helpers ────────────────────────────────────────────────────
  const recalcTotals = (items: QuotationItem[]) => {
    return items.map(item => ({
      ...item,
      totalPrice: item.isProductHeader ? 0 : item.quantity * item.unitPrice
    }))
  }

  const handleEditItemsClick = () => {
    if (quotation) {
      setEditItems(JSON.parse(JSON.stringify(quotation.items))) // deep clone
      setIsEditingItems(true)
    }
  }

  const handleCancelEditItems = () => {
    setIsEditingItems(false)
    setEditItems([])
  }

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number | boolean) => {
    const updated = [...editItems]
      ; (updated[index] as any)[field] = value
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = updated[index].isProductHeader
        ? 0
        : Number(updated[index].quantity) * Number(updated[index].unitPrice)
    }
    setEditItems(updated)
  }

  const handleAddItem = () => {
    const newItem: QuotationItem = {
      id: `new-${Date.now()}`,
      componentName: '',
      sacCode: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      isProductHeader: false,
      sortOrder: editItems.length
    }
    setEditItems([...editItems, newItem])
  }

  const handleAddHeader = () => {
    const newHeader: QuotationItem = {
      id: `new-header-${Date.now()}`,
      componentName: 'New Section',
      sacCode: null,
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      isProductHeader: true,
      sortOrder: editItems.length
    }
    setEditItems([...editItems, newHeader])
  }

  const handleRemoveItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index))
  }

  /** Derive subtotal / gst / total from current editItems and quotation settings */
  const deriveFinancials = (items: QuotationItem[]) => {
    if (!quotation) return {}
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const discountAmount =
      quotation.discountType === 'percentage'
        ? subtotal * ((quotation.discountValue || 0) / 100)
        : Math.min((quotation.discountValue || 0), subtotal)
    const afterDiscount = subtotal - discountAmount
    const gstPercent = quotation.gstPercent || 18
    const gstAmount = afterDiscount * (gstPercent / 100)
    const totalAmount = afterDiscount + gstAmount
    return {
      subtotal,
      discountAmount,
      gstAmount,
      totalAmount,
      cgstAmount: quotation.gstType === 'cgst_sgst' ? gstAmount / 2 : 0,
      sgstAmount: quotation.gstType === 'cgst_sgst' ? gstAmount / 2 : 0,
      igstAmount: quotation.gstType === 'igst' ? gstAmount : 0,
    }
  }

  const handleSaveItems = async () => {
    if (!quotation) return
    setIsSavingItems(true)
    try {
      const financials = deriveFinancials(editItems)
      const res = await orgFetch(`/api/quotations/${quotation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editItems.map((item, idx) => ({ ...item, sortOrder: idx })),
          ...financials,
          gstType: quotation.gstType,
          gstPercent: quotation.gstPercent
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setQuotation(updated)
        setIsEditingItems(false)
        setEditItems([])
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save items')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save items')
    } finally {
      setIsSavingItems(false)
    }
  }

  // ── Invoice creation ────────────────────────────────────────────────────────
  const handleGenerateInvoiceClick = async () => {
    if (!quotation) return
    try {
      const settingsRes = await orgFetch('/api/settings')
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData.settings)
      }
    } catch (e) {
      console.error(e)
    }

    const subtotal = quotation.subtotal || 0
    const discountAmount =
      quotation.discountType === 'percentage'
        ? subtotal * ((quotation.discountValue || 0) / 100)
        : Math.min((quotation.discountValue || 0), subtotal)
    const afterDiscount = subtotal - discountAmount
    const gstPercent = quotation.gstPercent || 18
    const gstAmount = afterDiscount * (gstPercent / 100)
    const totalAmount = afterDiscount + gstAmount

    setInvoiceData({
      ...invoiceData,
      invoiceNo: invoiceNo || '',
      invoiceDate: new Date().toISOString().split('T')[0],
      toCompanyName: quotation.toCompanyName || '',
      toAddress: quotation.toAddress || '',
      toGstNo: quotation.toGstNo || '',
      toPhone: quotation.toPhone || '',
      toEmail: quotation.toEmail || '',
      subtotal,
      discountType: quotation.discountType || 'percentage',
      discountValue: quotation.discountValue || 0,
      discountAmount,
      gstType: quotation.gstType || 'igst',
      gstPercent,
      gstAmount,
      totalAmount,
      notes: '',
      termsConditions: settings?.invoiceTermsConditions || quotation.termsConditions || '',
      items: JSON.parse(JSON.stringify(quotation.items)) as QuotationItem[] // deep clone
    })
    setShowEditInvoice(true)
  }

  const handleConfirmQuotation = async () => {
    if (!quotation) return
    const validationErrors: string[] = []
    if (!quotation.toCompanyName?.trim()) validationErrors.push('Company Name is required')
    if (!quotation.toAddress?.trim()) validationErrors.push('Address is required')
    if (!quotation.items || quotation.items.length === 0) validationErrors.push('At least one item is required')
    if (quotation.subtotal <= 0) validationErrors.push('Subtotal must be greater than 0')
    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n' + validationErrors.join('\n'))
      return
    }
    setConfirmingQuotation(true)
    try {
      const res = await orgFetch(`/api/quotations/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' })
      })
      if (res.ok) {
        setQuotation({ ...quotation, status: 'sent' })
        setShowConfirmQuotation(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to confirm quotation')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to confirm quotation')
    } finally {
      setConfirmingQuotation(false)
    }
  }

  const handleConfirmCreateInvoice = async () => {
    if (!quotation) return
    const validationErrors: string[] = []
    if (!invoiceData.toCompanyName?.trim()) validationErrors.push('Company Name is required')
    if (!invoiceData.toAddress?.trim()) validationErrors.push('Address is required')
    if (!invoiceData.invoiceDate) validationErrors.push('Invoice Date is required')
    if (invoiceData.subtotal <= 0) validationErrors.push('Subtotal must be greater than 0')
    if (!quotation.items || quotation.items.length === 0) validationErrors.push('At least one item is required in quotation')
    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n' + validationErrors.join('\n'))
      return
    }
    setShowConfirmInvoice(false)
    setCreatingInvoice(true)
    try {
      const res = await orgFetch(`/api/quotations/${params.id}/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: invoiceData.invoiceNo || undefined,
          invoiceDate: invoiceData.invoiceDate,
          toCompanyName: invoiceData.toCompanyName || undefined,
          toAddress: invoiceData.toAddress || undefined,
          toGstNo: invoiceData.toGstNo || undefined,
          toPhone: invoiceData.toPhone || undefined,
          toEmail: invoiceData.toEmail || undefined,
          subtotal: invoiceData.subtotal,
          discountType: invoiceData.discountType,
          discountValue: invoiceData.discountValue,
          discountAmount: invoiceData.discountAmount,
          gstType: invoiceData.gstType,
          gstPercent: invoiceData.gstPercent,
          gstAmount: invoiceData.gstAmount,
          totalAmount: invoiceData.totalAmount,
          notes: invoiceData.notes || undefined,
          termsConditions: invoiceData.termsConditions || undefined,
          items: invoiceData.items.filter(item => item.componentName || item.isProductHeader).map((item, idx) => ({ ...item, sortOrder: idx }))
        })
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
      setShowEditInvoice(false)
    }
  }

  const downloadPDF = async () => {
    if (!quotation) return
    setActionLoading('download')
    try {
      const res = await orgFetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotationId: quotation.id })
      })
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotation.quotationNo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error generating PDF:', e)
      alert('Failed to generate PDF')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteClick = () => setShowDeleteConfirm(true)

  const deleteQuotation = async () => {
    if (!quotation) return
    setIsDeleting(true)
    try {
      const res = await orgFetch(`/api/quotations/${quotation.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        alert('Failed to delete quotation')
      }
    } catch {
      alert('Failed to delete quotation')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!quotation) return <div className="h-screen flex items-center justify-center">Quotation not found</div>

  const gstPercent = quotation.gstPercent || APP_CONFIG.defaultGstPercent
  const isDraft = quotation.status === 'draft'

  // Compute display-time item subtotal when editing
  const editSubtotal = editItems.reduce((s, i) => s + (i.totalPrice || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation ${quotation?.quotationNo}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={deleteQuotation}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
        variant="danger"
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Quotation {quotation.quotationNo}</h1>
          <span className={`px-2 py-1 text-xs rounded ${quotation.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
            {quotation.status.toUpperCase()}
          </span>
        </div>
        <div className="mb-4 text-sm text-gray-500">
          Date: {isEditing ? <input type="date" value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''} onChange={(e) => setEditData({ ...editData, date: e.target.value } as any)} className="px-2 py-1 border rounded" /> : formatDate(quotation.date)}
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <button onClick={downloadPDF} disabled={actionLoading === 'download'} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
            {actionLoading === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Download
          </button>

          {quotation.status === 'draft' && (
            <>
              <button onClick={() => setShowConfirmQuotation(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                <Check className="w-4 h-4" /> Confirm Quotation
              </button>
              <button onClick={handleGenerateInvoiceClick} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                Generate Invoice
              </button>
              <button onClick={handleDeleteClick} className="flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded-md hover:bg-red-50 text-sm">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}

          {quotation.status === 'sent' && (
            <>
              <button onClick={handleGenerateInvoiceClick} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                Generate Invoice
              </button>
              <button onClick={handleDeleteClick} className="flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded-md hover:bg-red-50 text-sm">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}

          {quotation.status === 'accepted' && quotation.invoiceId && (
            <Link href={`/dashboard/invoice/${quotation.invoiceId}`} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm">
              View Invoice
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">

            {/* ── Client Details ── */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-semibold">Client Details</h2>
                {isDraft && !isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={editData.toCompanyName}
                      onChange={(e) => setEditData({ ...editData, toCompanyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={editData.toAddress}
                      onChange={(e) => setEditData({ ...editData, toAddress: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                      <input
                        type="text"
                        value={editData.toGstNo}
                        onChange={(e) => setEditData({ ...editData, toGstNo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={editData.toPhone}
                        onChange={(e) => setEditData({ ...editData, toPhone: e.target.value })}
                        placeholder="Phone (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editData.toEmail}
                      onChange={(e) => setEditData({ ...editData, toEmail: e.target.value })}
                      placeholder="Email (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Type</label>
                      <select
                        value={(editData as any).gstType}
                        onChange={(e) => setEditData({ ...editData, gstType: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="igst">IGST</option>
                        <option value="cgst_sgst">CGST + SGST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate %</label>
                      <select
                        value={(editData as any).gstPercent}
                        onChange={(e) => setEditData({ ...editData, gstPercent: parseFloat(e.target.value) || 0 } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                      <select
                        value={(editData as any).discountType}
                        onChange={(e) => setEditData({ ...editData, discountType: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                      <input
                        type="number"
                        min={0}
                        value={(editData as any).discountValue}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value) || 0;
                          if ((editData as any).discountType === 'percentage') {
                            val = Math.min(val, 100);
                          } else {
                            val = Math.min(val, quotation.subtotal);
                          }
                          setEditData({ ...editData, discountValue: val } as any);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-medium">{quotation.toCompanyName}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.toAddress}</p>
                  {quotation.toGstNo && <p className="text-sm mt-2">GST: {quotation.toGstNo}</p>}
                  {quotation.toPhone && <p className="text-sm">Phone: {quotation.toPhone}</p>}
                  {quotation.toEmail && <p className="text-sm">Email: {quotation.toEmail}</p>}
                </>
              )}
            </div>

            {/* ── Items ── */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowComponents(!showComponents)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <span className={`transition-transform ${showComponents ? 'rotate-180' : ''}`}>▼</span>
                  {showComponents ? 'Hide' : 'Show'} Items ({quotation.items.length})
                </button>

                {isDraft && !isEditingItems && (
                  <button
                    onClick={handleEditItemsClick}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Items
                  </button>
                )}
              </div>

              {showComponents && (
                isEditingItems ? (
                  /* ── Editable items table ── */
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-2 px-2">Particulars</th>
                            <th className="text-center py-2 px-2 w-28">HSN/SAC</th>
                            <th className="text-center py-2 px-2 w-20">Qty</th>
                            <th className="text-right py-2 px-2 w-28">Unit Price</th>
                            <th className="text-right py-2 px-2 w-28">Amount</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editItems.map((item, i) => (
                            <tr key={item.id} className={`border-b ${item.isProductHeader ? 'bg-blue-50' : ''}`}>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={item.componentName}
                                  onChange={(e) => handleItemChange(i, 'componentName', e.target.value)}
                                  placeholder={item.isProductHeader ? 'Section heading…' : 'Item name…'}
                                  className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.isProductHeader ? 'font-semibold' : ''}`}
                                />
                              </td>
                              <td className="py-1 px-2">
                                {!item.isProductHeader && (
                                  <input
                                    type="text"
                                    value={item.sacCode || ''}
                                    onChange={(e) => handleItemChange(i, 'sacCode', e.target.value)}
                                    placeholder="SAC"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                )}
                              </td>
                              <td className="py-1 px-2">
                                {!item.isProductHeader && (
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(i, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                )}
                              </td>
                              <td className="py-1 px-2">
                                {!item.isProductHeader && (
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                )}
                              </td>
                              <td className="py-1 px-2 text-right font-medium">
                                {item.isProductHeader ? '' : formatIndianCurrency(item.totalPrice)}
                              </td>
                              <td className="py-1 px-1">
                                <button
                                  onClick={() => handleRemoveItem(i)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                  title="Remove row"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="pt-3 text-right pr-2 text-sm font-semibold">Subtotal:</td>
                            <td className="pt-3 text-right font-bold text-sm">{formatIndianCurrency(editSubtotal)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleAddItem}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-500 text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4" /> Add Item
                      </button>
                      <button
                        onClick={handleAddHeader}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4" /> Add Section Header
                      </button>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <button
                        onClick={handleSaveItems}
                        disabled={isSavingItems}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSavingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Items
                      </button>
                      <button
                        onClick={handleCancelEditItems}
                        className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only items table ── */
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
                      {quotation.items.map((item: QuotationItem, i: number) => (
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
                )
              )}
            </div>

            {quotation.termsConditions && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold mb-2">Terms & Conditions</h2>
                <p className="text-sm whitespace-pre-wrap">{quotation.termsConditions}</p>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
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
                  <span>{formatIndianCurrency(quotation.subtotal)}</span>
                </div>

                {/* FIX 1: Show discount when discountAmount is a positive number */}
                {(quotation.discountAmount != null && quotation.discountAmount > 0) && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Discount
                      {quotation.discountType === 'percentage' && quotation.discountValue
                        ? ` (${quotation.discountValue}%)`
                        : ''}
                      :
                    </span>
                    <span>-{formatIndianCurrency(quotation.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">GST ({quotation.gstPercent}%):</span>
                  <div className="text-right">
                    {quotation.gstType === 'cgst_sgst' ? (
                      <>
                        <div className="text-xs text-slate-500">CGST ({(quotation.gstPercent / 2)}%): {formatIndianCurrency(quotation.gstAmount / 2)}</div>
                        <div className="text-xs text-slate-500">SGST ({(quotation.gstPercent / 2)}%): {formatIndianCurrency(quotation.gstAmount / 2)}</div>
                        <div className="font-medium">{formatIndianCurrency(quotation.gstAmount)}</div>
                      </>
                    ) : (
                      <div className="font-medium">{formatIndianCurrency(quotation.gstAmount)}</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>{formatIndianCurrency(quotation.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">Actions</h2>
              <div className="space-y-2">
                {quotation.invoiceId ? (
                  <Link
                    href={`/dashboard/invoice/${quotation.invoiceId}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800"
                  >
                    <Check className="w-4 h-4" /> View Invoice
                  </Link>
                ) : (
                  <>
                    {isDraft && (
                      <button
                        onClick={() => setShowConfirmQuotation(true)}
                        disabled={confirmingQuotation}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                      >
                        {confirmingQuotation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Confirm Quotation
                      </button>
                    )}
                    {!isDraft && (
                      <button
                        onClick={handleGenerateInvoiceClick}
                        disabled={creatingInvoice}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                      >
                        {creatingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Generate Invoice
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={downloadPDF}
                  disabled={actionLoading === 'download'}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-blue-600 text-blue-700 rounded-md hover:bg-blue-50 font-medium disabled:opacity-50"
                >
                  {actionLoading === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Download PDF
                </button>

                <button
                  onClick={handleDeleteClick}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-slate-900 text-slate-900 rounded-md hover:bg-slate-50 font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Delete Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Invoice Modal ── */}
      {showEditInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl mx-4 my-8">
            <h2 className="text-lg font-semibold mb-4">Create Invoice - Edit Details</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNo}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNo: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Client Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input type="text" value={invoiceData.toCompanyName}
                      onChange={(e) => setInvoiceData({ ...invoiceData, toCompanyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                    <input type="text" value={invoiceData.toGstNo}
                      onChange={(e) => setInvoiceData({ ...invoiceData, toGstNo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <textarea value={invoiceData.toAddress}
                      onChange={(e) => setInvoiceData({ ...invoiceData, toAddress: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={invoiceData.toPhone}
                      onChange={(e) => setInvoiceData({ ...invoiceData, toPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-500">(Optional)</span></label>
                    <input type="email" value={invoiceData.toEmail}
                      onChange={(e) => setInvoiceData({ ...invoiceData, toEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Editable Items Table */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Products & Services</h3>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => setInvoiceData(prev => ({ ...prev, items: [...prev.items, { id: `new-${Date.now()}`, componentName: '', sacCode: '', quantity: 1, unitPrice: 0, totalPrice: 0, isProductHeader: false, sortOrder: prev.items.length }] }))}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                    <button
                      onClick={() => setInvoiceData(prev => ({ ...prev, items: [...prev.items, { id: `head-${Date.now()}`, componentName: 'New Section', sacCode: null, quantity: 0, unitPrice: 0, totalPrice: 0, isProductHeader: true, sortOrder: prev.items.length }] }))}
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded"
                    >
                      <Plus className="w-3 h-3" /> Add Section Header
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Particulars</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600 w-24">HSN/SAC</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600 w-24">Qty</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600 w-32">Unit Price</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600 w-32">Amount</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoiceData.items.map((item, i) => (
                        <tr key={item.id} className={item.isProductHeader ? 'bg-blue-50/50' : ''}>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={item.componentName}
                              onChange={(e) => {
                                const newItems = [...invoiceData.items]
                                newItems[i].componentName = e.target.value
                                setInvoiceData({ ...invoiceData, items: newItems })
                              }}
                              placeholder={item.isProductHeader ? 'Section Header' : 'Item Name'}
                              className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.isProductHeader ? 'font-semibold' : ''}`}
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            {!item.isProductHeader && (
                              <input
                                type="text"
                                value={item.sacCode || ''}
                                onChange={(e) => {
                                  const newItems = [...invoiceData.items]
                                  newItems[i].sacCode = e.target.value
                                  setInvoiceData({ ...invoiceData, items: newItems })
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="py-1.5 px-3">
                            {!item.isProductHeader && (
                              <input
                                type="number"
                                min={0}
                                value={item.quantity}
                                onChange={(e) => {
                                  const qty = parseFloat(e.target.value) || 0
                                  const newItems = [...invoiceData.items]
                                  newItems[i].quantity = qty
                                  newItems[i].totalPrice = qty * newItems[i].unitPrice

                                  const newSubtotal = newItems.reduce((acc, curr) => curr.isProductHeader ? acc : acc + curr.totalPrice, 0)
                                  const discountAmount = invoiceData.discountType === 'percentage'
                                    ? newSubtotal * (invoiceData.discountValue / 100)
                                    : Math.min(invoiceData.discountValue, newSubtotal)
                                  const afterDiscount = newSubtotal - discountAmount
                                  const gstAmount = afterDiscount * (invoiceData.gstPercent / 100)

                                  setInvoiceData({ ...invoiceData, items: newItems, subtotal: newSubtotal, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="py-1.5 px-3">
                            {!item.isProductHeader && (
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const price = parseFloat(e.target.value) || 0
                                  const newItems = [...invoiceData.items]
                                  newItems[i].unitPrice = price
                                  newItems[i].totalPrice = newItems[i].quantity * price

                                  const newSubtotal = newItems.reduce((acc, curr) => curr.isProductHeader ? acc : acc + curr.totalPrice, 0)
                                  const discountAmount = invoiceData.discountType === 'percentage'
                                    ? newSubtotal * (invoiceData.discountValue / 100)
                                    : Math.min(invoiceData.discountValue, newSubtotal)
                                  const afterDiscount = newSubtotal - discountAmount
                                  const gstAmount = afterDiscount * (invoiceData.gstPercent / 100)

                                  setInvoiceData({ ...invoiceData, items: newItems, subtotal: newSubtotal, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium">
                            {item.isProductHeader ? '' : formatIndianCurrency(item.totalPrice)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              onClick={() => {
                                const newItems = invoiceData.items.filter((_, index) => index !== i)
                                const newSubtotal = newItems.reduce((acc, curr) => curr.isProductHeader ? acc : acc + curr.totalPrice, 0)
                                const discountAmount = invoiceData.discountType === 'percentage'
                                  ? newSubtotal * (invoiceData.discountValue / 100)
                                  : Math.min(invoiceData.discountValue, newSubtotal)
                                const afterDiscount = newSubtotal - discountAmount
                                const gstAmount = afterDiscount * (invoiceData.gstPercent / 100)

                                setInvoiceData({ ...invoiceData, items: newItems, subtotal: newSubtotal, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                              }}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal *</label>
                    <input type="number" value={invoiceData.subtotal}
                      onChange={(e) => {
                        const subtotal = parseFloat(e.target.value) || 0
                        const discountAmount = invoiceData.discountType === 'percentage'
                          ? subtotal * (invoiceData.discountValue / 100) : invoiceData.discountValue
                        const afterDiscount = subtotal - discountAmount
                        const gstAmount = afterDiscount * (invoiceData.gstPercent / 100)
                        setInvoiceData({ ...invoiceData, subtotal, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select value={invoiceData.discountType}
                      onChange={(e) => {
                        const discountAmount = e.target.value === 'percentage'
                          ? invoiceData.subtotal * (invoiceData.discountValue / 100) : invoiceData.discountValue
                        const afterDiscount = invoiceData.subtotal - discountAmount
                        const gstAmount = afterDiscount * (invoiceData.gstPercent / 100)
                        setInvoiceData({ ...invoiceData, discountType: e.target.value, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount {invoiceData.discountType === 'percentage' ? '(%)' : '(₹)'}</label>
                    <input type="number" value={invoiceData.discountValue}
                      onChange={(e) => {
                        const discountValue = parseFloat(e.target.value) || 0
                        const discountAmount = invoiceData.discountType === 'percentage'
                          ? invoiceData.subtotal * (discountValue / 100) : discountValue
                        const afterDiscount = invoiceData.subtotal - discountAmount
                        const gstAmount = afterDiscount * (invoiceData.gstPercent / 100)
                        setInvoiceData({ ...invoiceData, discountValue, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Type *</label>
                    <select value={invoiceData.gstType}
                      onChange={(e) => {
                        const gstType = e.target.value
                        setInvoiceData({ ...invoiceData, gstType })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="igst">IGST</option>
                      <option value="cgst_sgst">CGST + SGST</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate % *</label>
                    <select value={invoiceData.gstPercent}
                      onChange={(e) => {
                        const gstPercent = parseFloat(e.target.value) || 0
                        const discountAmount = invoiceData.discountType === 'percentage'
                          ? invoiceData.subtotal * (invoiceData.discountValue / 100) : Math.min(invoiceData.discountValue, invoiceData.subtotal)
                        const afterDiscount = invoiceData.subtotal - discountAmount
                        const gstAmount = afterDiscount * (gstPercent / 100)
                        setInvoiceData({ ...invoiceData, gstPercent, discountAmount, gstAmount, totalAmount: afterDiscount + gstAmount })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>₹{invoiceData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {invoiceData.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount:</span>
                        <span>-₹{invoiceData.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-600">GST ({invoiceData.gstPercent}%):</span>
                      <div className="text-right">
                        {invoiceData.gstType === 'cgst_sgst' ? (
                          <>
                            <div className="text-xs text-slate-500">CGST ({(invoiceData.gstPercent / 2)}%): ₹{(invoiceData.gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-slate-500">SGST ({(invoiceData.gstPercent / 2)}%): ₹{(invoiceData.gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="font-medium">₹{invoiceData.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          </>
                        ) : (
                          <div className="font-medium">₹{invoiceData.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                      <span>Total:</span>
                      <span>₹{invoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-500">(Optional)</span></label>
                  <textarea value={invoiceData.notes}
                    onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea value={invoiceData.termsConditions}
                    onChange={(e) => setInvoiceData({ ...invoiceData, termsConditions: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditInvoice(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => setShowConfirmInvoice(true)}
                className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800">
                Continue to Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmQuotation}
        title="Confirm Quotation"
        message="Are you sure you want to confirm this quotation? This will validate all required fields."
        confirmText="Confirm Quotation"
        onConfirm={handleConfirmQuotation}
        onCancel={() => setShowConfirmQuotation(false)}
        isLoading={confirmingQuotation}
        variant="info"
      />

      <ConfirmDialog
        isOpen={showConfirmInvoice}
        title="Confirm Invoice Creation"
        message={`Are you sure you want to create an invoice for ${formatIndianCurrency(quotation?.totalAmount || 0)}?`}
        confirmText="Create Invoice"
        onConfirm={handleConfirmCreateInvoice}
        onCancel={() => setShowConfirmInvoice(false)}
        isLoading={creatingInvoice}
        variant="info"
      />
    </div>
  )
}