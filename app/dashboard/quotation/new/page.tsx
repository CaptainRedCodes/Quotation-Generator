'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Trash2, Save, FileDown, Mail, X, AlertCircle, ArrowLeft } from 'lucide-react'
import { formatIndianCurrency, amountToWords, generateQuotationNo, formatDate } from '@/lib/utils'
import { EmailModal } from '@/components/EmailModal'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  active: boolean
  components: ProductComponent[]
}

interface ProductComponent {
  id: string
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
}

interface QuotationItem {
  id: string
  componentName: string
  sacCode: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  isProductHeader: boolean
}

export default function NewQuotationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [formData, setFormData] = useState({
    toCompanyName: '',
    toAddress: '',
    toGstNo: '',
    toPhone: '',
    toEmail: '',
    quotationNo: '',
    date: formatDate(new Date()),
    termsConditions: ''
  })

  const [items, setItems] = useState<QuotationItem[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [productsRes, settingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/settings')
        ])
        const productsData = await productsRes.json()
        const settingsData = await settingsRes.json()
        setProducts(productsData)
        if (settingsData.settings) {
          setFormData(prev => ({
            ...prev,
            termsConditions: settingsData.settings.termsConditions || ''
          }))
        }
        const lastQuotationRes = await fetch('/api/quotations')
        const quotations = await lastQuotationRes.json()
        const lastNo = quotations.length > 0 ? quotations[0].quotationNo : null
        setFormData(prev => ({
          ...prev,
          quotationNo: generateQuotationNo(lastNo, new Date())
        }))
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const subtotal = items.reduce((sum, item) => sum + (item.isProductHeader ? 0 : item.totalPrice), 0)
  const gstAmount = subtotal * 0.18
  const totalAmount = subtotal + gstAmount
  const amountInWords = amountToWords(totalAmount)

  const handleAddProduct = (product: Product) => {
    const newItems: QuotationItem[] = [
      {
        id: `header-${product.id}-${Date.now()}`,
        componentName: product.name,
        sacCode: null,
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        isProductHeader: true
      },
      ...product.components.map((comp, idx) => ({
        id: `comp-${comp.id}-${Date.now()}-${idx}`,
        componentName: comp.componentName,
        sacCode: comp.sacCode,
        quantity: comp.quantity,
        unitPrice: comp.unitPrice,
        totalPrice: comp.quantity * comp.unitPrice,
        isProductHeader: false
      }))
    ]
    setItems([...items, ...newItems])
    setSavedQuotationId(null)
    setSaveSuccess(false)
  }

  const handleAddCustomItem = () => {
    setItems([
      ...items,
      {
        id: `custom-${Date.now()}`,
        componentName: '',
        sacCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        isProductHeader: false
      }
    ])
    setSavedQuotationId(null)
    setSaveSuccess(false)
  }

  const handleUpdateItem = (id: string, field: string, value: string | number | boolean) => {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.totalPrice = updated.quantity * updated.unitPrice
      }
      return updated
    }))
    setSavedQuotationId(null)
    setSaveSuccess(false)
  }

  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find(item => item.id === id)
    if (itemToDelete?.isProductHeader) {
      const headerIndex = items.findIndex(item => item.id === id)
      const relatedIds = new Set<string>()
      relatedIds.add(id)
      for (let i = headerIndex + 1; i < items.length; i++) {
        if (items[i].isProductHeader) break
        relatedIds.add(items[i].id)
      }
      setItems(items.filter(item => !relatedIds.has(item.id)))
    } else {
      setItems(items.filter(item => item.id !== id))
    }
    setSavedQuotationId(null)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const validItems = items.filter(item => item.isProductHeader || item.componentName)

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'draft',
          items: validItems
        })
      })

      if (res.ok) {
        const quotation = await res.json()
        setSavedQuotationId(quotation.id)
        setSaveSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save quotation')
      }
    } catch (error) {
      console.error('Error saving quotation:', error)
      setError('Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!savedQuotationId) return
    setDownloading(true)
    setError(null)
    try {
      const pdfRes = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotationId: savedQuotationId })
      })

      if (!pdfRes.ok) {
        const data = await pdfRes.json()
        setError(data.error || 'Failed to generate PDF')
        return
      }

      const blob = await pdfRes.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${formData.quotationNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setError('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  const handleSendEmail = () => {
    if (!savedQuotationId) return
    setShowEmailModal(true)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const isSaved = !!savedQuotationId

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">←</Link>
            <h1 className="text-lg font-semibold">New Quotation</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(true)} className="px-3 py-1.5 border text-sm rounded-md hover:bg-gray-50">Preview</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-black text-white text-sm rounded-md disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Save success banner */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <p className="text-green-800 text-sm font-medium">
              ✓ Quotation saved. You can now download the PDF or send via email.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-green-700 underline hover:text-green-900"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Client Details */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Client Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Company Name *</label>
                  <input
                    type="text"
                    value={formData.toCompanyName}
                    onChange={(e) => { setFormData({ ...formData, toCompanyName: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Address *</label>
                  <textarea
                    value={formData.toAddress}
                    onChange={(e) => { setFormData({ ...formData, toAddress: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={formData.toGstNo}
                    onChange={(e) => { setFormData({ ...formData, toGstNo: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.toPhone}
                    onChange={(e) => { setFormData({ ...formData, toPhone: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.toEmail}
                    onChange={(e) => { setFormData({ ...formData, toEmail: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Products</h2>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value)
                      if (product) handleAddProduct(product)
                      e.target.value = ''
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Add Product</option>
                    {products.filter(p => p.active).map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCustomItem}
                    className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No items added. Select a product or add a custom item.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-slate-600">Particulars</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-slate-600 w-24">SAC Code</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-slate-600 w-20">Qty</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-slate-600 w-28">Unit Price</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-slate-600 w-28">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((item) => (
                        <tr key={item.id} className={item.isProductHeader ? 'bg-blue-50' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.componentName}
                              onChange={(e) => handleUpdateItem(item.id, 'componentName', e.target.value)}
                              className={`w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.isProductHeader ? 'font-bold bg-transparent' : ''}`}
                              readOnly={item.isProductHeader}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.sacCode || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'sacCode', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              readOnly={item.isProductHeader}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.isProductHeader ? '' : item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              readOnly={item.isProductHeader}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.isProductHeader ? '' : item.unitPrice}
                              onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              readOnly={item.isProductHeader}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {item.isProductHeader ? '' : formatIndianCurrency(item.totalPrice)}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Terms & Conditions</h2>
              <textarea
                value={formData.termsConditions}
                onChange={(e) => { setFormData({ ...formData, termsConditions: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quotation No.</label>
                  <input
                    type="text"
                    value={formData.quotationNo}
                    onChange={(e) => { setFormData({ ...formData, quotationNo: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => { setFormData({ ...formData, date: e.target.value }); setSavedQuotationId(null); setSaveSuccess(false) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">₹{formatIndianCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">GST @ 18%</span>
                  <span className="font-medium">₹{formatIndianCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                  <span>Total Payable Amount</span>
                  <span>₹{formatIndianCurrency(totalAmount)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-md">
                <p className="text-xs text-slate-600">{amountInWords}</p>
              </div>

              {/* Save CTA */}
              {!isSaved && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save as Draft
                </button>
              )}

              {/* Post-save actions */}
              {isSaved && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Download PDF
                  </button>
                  <button
                    onClick={handleSendEmail}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-md hover:bg-green-50 font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 text-center"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Quotation Preview</h2>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-100">
              <div className="bg-white mx-auto shadow-lg" style={{ maxWidth: 794, padding: '24px 30px', fontFamily: 'Helvetica, Arial, sans-serif' }}>

                {/* Title */}
                <h1 className="text-center font-bold mb-2" style={{ fontSize: 16, letterSpacing: 2 }}>QUOTATION</h1>

                {/* Company Header */}
                <div className="flex border border-black" style={{ minHeight: 60 }}>
                  <div className="border-r border-black flex items-center justify-center" style={{ width: 80, minHeight: 60 }}>
                    <img src="/adisen.png" alt="Logo" style={{ maxWidth: 70, maxHeight: 50, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="flex-1 p-1.5 flex flex-col justify-between">
                    <div>
                      <p className="font-bold" style={{ fontSize: 10 }}>ADISEN TECH PVT LTD</p>
                      <p style={{ fontSize: 7, marginTop: 1 }}>No.25/1, Ground Floor, Shama Rao Compound, (P, Kalinga Rao Road), Mission Road, Bangalore-560025.</p>
                    </div>
                    <p style={{ fontSize: 7 }}>GST No. 29ABBCS1596E1Z6 &nbsp;|&nbsp; PAN: ABBCS1596E</p>
                  </div>
                </div>

                {/* TO / Date Box */}
                <div className="flex border-l border-r border-b border-black" style={{ minHeight: 75 }}>
                  <div className="border-r border-black p-1.5 flex flex-col gap-0.5" style={{ width: '55%', fontSize: 7 }}>
                    <p className="font-bold" style={{ fontSize: 8 }}>TO</p>
                    <p className="font-bold" style={{ fontSize: 8 }}>M/S. {formData.toCompanyName || '-'}</p>
                    <p className="whitespace-pre-wrap">{formData.toAddress || '-'}</p>
                    {formData.toGstNo && <p>GST No: {formData.toGstNo}</p>}
                    {formData.toPhone && <p>Phone: {formData.toPhone}</p>}
                  </div>
                  <div className="flex-1 p-1.5 flex flex-col justify-center gap-2" style={{ fontSize: 8 }}>
                    <div className="flex gap-2">
                      <span className="font-bold whitespace-nowrap">QUOTATION NO :</span>
                      <span className="font-bold">{formData.quotationNo}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold whitespace-nowrap">DATE :</span>
                      <span className="font-bold">{formData.date}</span>
                    </div>
                  </div>
                </div>

                {/* Table Header */}
                <div className="flex border-l border-r border-b border-black font-bold" style={{ fontSize: 7.5 }}>
                  <div className="p-1 border-r border-black" style={{ width: '42%' }}>PARTICULARS</div>
                  <div className="p-1 border-r border-black text-center" style={{ width: '12%' }}>HSN/SAC</div>
                  <div className="p-1 border-r border-black text-center" style={{ width: '8%' }}>Qty</div>
                  <div className="p-1 border-r border-black text-right" style={{ width: '19%' }}>Unit Price</div>
                  <div className="p-1 text-right" style={{ width: '19%' }}>Amount</div>
                </div>

                {/* Table Rows */}
                <div className="border-l border-r border-black">
                  {items.filter(i => i.componentName).map((item) => (
                    <div key={item.id} className="flex border-b border-slate-200" style={{ fontSize: 7, minHeight: item.isProductHeader ? 16 : 14 }}>
                      <div className="p-1 border-r border-black" style={{ width: '42%', fontWeight: item.isProductHeader ? 700 : 400, fontSize: item.isProductHeader ? 8 : 7 }}>
                        {item.componentName}
                      </div>
                      <div className="p-1 border-r border-black text-center" style={{ width: '12%' }}>
                        {!item.isProductHeader ? (item.sacCode || '') : ''}
                      </div>
                      <div className="p-1 border-r border-black text-center" style={{ width: '8%' }}>
                        {!item.isProductHeader && item.quantity > 0 ? item.quantity : ''}
                      </div>
                      <div className="p-1 border-r border-black text-right" style={{ width: '19%' }}>
                        {item.isProductHeader ? '' : (!item.isProductHeader && item.unitPrice > 0 ? formatIndianCurrency(item.unitPrice) : '')}
                      </div>
                      <div className="p-1 text-right" style={{ width: '19%' }}>
                        {item.isProductHeader ? '' : (!item.isProductHeader && item.totalPrice > 0 ? formatIndianCurrency(item.totalPrice) : '')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* GST */}
                <div className="flex border border-black border-t-0" style={{ fontSize: 8 }}>
                  <div className="p-1 flex-1 font-bold">GST @ 18%</div>
                  <div className="p-1 text-right border-l border-black" style={{ width: '19%' }}>
                    {formatIndianCurrency(gstAmount)}
                  </div>
                </div>

                {/* Total */}
                <div className="flex border-l border-r border-b border-black" style={{ fontSize: 9 }}>
                  <div className="p-1 flex-1 font-bold">Total Payable Amount (in Figures)</div>
                  <div className="p-1 text-right border-l border-black font-bold" style={{ width: '19%' }}>
                    {formatIndianCurrency(totalAmount)}
                  </div>
                </div>

                {/* Words */}
                <div className="border-l border-r border-b border-black p-1" style={{ fontSize: 7.5 }}>
                  <span>Total Amount Payable (in Words)&nbsp;&nbsp;</span>
                  <span className="font-medium">{amountInWords}</span>
                </div>

                {/* Terms */}
                {formData.termsConditions && (
                  <div className="border-l border-r border-b border-black p-1.5" style={{ fontSize: 7 }}>
                    <p className="font-bold mb-0.5" style={{ fontSize: 8 }}>TERMS & CONDITIONS:</p>
                    {formData.termsConditions.split('\n').filter(l => l.trim()).map((line, i) => (
                      <p key={i}>{i + 1}.&nbsp;&nbsp;{line.replace(/^\d+[\.\)]\s*/, '')}</p>
                    ))}
                  </div>
                )}

                {/* Signature */}
                <div className="border-l border-r border-b border-black p-1.5 text-right" style={{ minHeight: 50, fontSize: 8 }}>
                  <p className="font-bold">For&nbsp;&nbsp;ADISEN TECH PVT LTD</p>
                  <p className="font-bold mt-6">Authorised Signatory</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && savedQuotationId && (
        <EmailModal
          quotationId={savedQuotationId}
          to={formData.toEmail}
          quotationNo={formData.quotationNo}
          date={formData.date}
          subtotal={subtotal}
          gst={gstAmount}
          total={totalAmount}
          userName={session?.user?.name || ''}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false)
            router.push('/dashboard')
          }}
        />
      )}
    </div>
  )
}