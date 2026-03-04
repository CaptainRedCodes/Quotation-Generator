'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Trash2, Eye, Save, FileDown, Mail, X, AlertCircle } from 'lucide-react'
import { formatIndianCurrency, amountToWords, generateQuotationNo, formatDate } from '@/lib/utils'
import { EmailModal } from '@/components/EmailModal'

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
  const [products, setProducts] = useState<Product[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
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
  }

  const handleSave = async (status: string = 'draft') => {
    setSaving(true)
    setError(null)
    try {
      const validItems = items.filter(item => item.componentName && !item.isProductHeader)
      
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status,
          items: validItems
        })
      })

      if (res.ok) {
        const quotation = await res.json()
        setSavedQuotationId(quotation.id)
        if (status === 'draft') {
          router.push('/dashboard')
        }
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
    setError(null)
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'draft',
          items: items.filter(item => item.componentName && !item.isProductHeader)
        })
      })

      const quotation = await res.json()
      setSavedQuotationId(quotation.id)

      const pdfRes = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotationId: quotation.id })
      })

      const blob = await pdfRes.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${formData.quotationNo}.pdf`
      a.click()
    } catch (error) {
      console.error('Error downloading PDF:', error)
      setError('Failed to download PDF')
    }
  }

  const handleSendEmail = async () => {
    setError(null)
    // Save first if not already saved
    if (!savedQuotationId) {
      try {
        const validItems = items.filter(item => item.componentName && !item.isProductHeader)
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
          setShowEmailModal(true)
        } else {
          setError('Failed to save quotation before sending email')
        }
      } catch (error) {
        console.error('Error:', error)
        setError('Failed to prepare email')
      }
    } else {
      setShowEmailModal(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-900 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">New Quotation</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-800 hover:bg-blue-700 rounded-md text-sm"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 bg-blue-800 hover:bg-blue-700 rounded-md text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-3 py-2 bg-blue-800 hover:bg-blue-700 rounded-md text-sm"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-md text-sm"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Client Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.toCompanyName}
                    onChange={(e) => setFormData({ ...formData, toCompanyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Address *
                  </label>
                  <textarea
                    value={formData.toAddress}
                    onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={formData.toGstNo}
                    onChange={(e) => setFormData({ ...formData, toGstNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.toPhone}
                    onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.toEmail}
                    onChange={(e) => setFormData({ ...formData, toEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

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
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
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
                <p className="text-slate-500 text-center py-8">
                  No items added. Select a product or add a custom item.
                </p>
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
                              className={`w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                item.isProductHeader ? 'font-bold bg-transparent' : ''
                              }`}
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
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              readOnly={item.isProductHeader}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              readOnly={item.isProductHeader}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatIndianCurrency(item.totalPrice)}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
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

            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Terms & Conditions</h2>
              <textarea
                value={formData.termsConditions}
                onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quotation No.
                  </label>
                  <input
                    type="text"
                    value={formData.quotationNo}
                    onChange={(e) => setFormData({ ...formData, quotationNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
            </div>
          </div>
        </div>
      </main>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Quotation Preview</h2>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8">
              <h1 className="text-center text-xl font-bold mb-8">QUOTATION</h1>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-bold text-sm">ADISEN TECH PVT LTD</h3>
                  <p className="text-xs mt-1">No.25/1, Ground Floor, Shama Rao Compound</p>
                  <p className="text-xs">(P, Kalinga Rao Road), Mission Road</p>
                  <p className="text-xs">Bangalore-560025</p>
                  <p className="text-xs mt-1">GST No: 29ABBCS1596E1Z6</p>
                  <p className="text-xs">PAN: ABBCS1596E</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">QUOTATION DATE: {formData.date}</p>
                  <p className="text-sm">QUOTATION NO: {formData.quotationNo}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold text-sm mb-2">TO</h3>
                <p className="text-sm">M/S. {formData.toCompanyName || '-'}</p>
                <p className="text-sm whitespace-pre-line">{formData.toAddress || '-'}</p>
                {formData.toGstNo && <p className="text-sm">GST No: {formData.toGstNo}</p>}
                {formData.toPhone && <p className="text-sm">Phone: {formData.toPhone}</p>}
              </div>

              <table className="w-full mb-4 text-sm">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-2">PARTICULARS</th>
                    <th className="text-left py-2 w-20">SAC Codes</th>
                    <th className="text-left py-2 w-16">Qty</th>
                    <th className="text-right py-2 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => i.componentName).map((item) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className={`py-2 ${item.isProductHeader ? 'font-bold' : ''}`}>{item.componentName}</td>
                      <td className="py-2">{item.sacCode || '-'}</td>
                      <td className="py-2">{item.isProductHeader ? '' : item.quantity}</td>
                      <td className="py-2 text-right">{item.isProductHeader ? '' : formatIndianCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-black">
                    <td className="py-2" colSpan={3}>GST @ 18%</td>
                    <td className="py-2 text-right">{formatIndianCurrency(gstAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold" colSpan={3}>Total Payable Amount</td>
                    <td className="py-2 text-right font-bold">{formatIndianCurrency(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-sm mb-4">Total Amount Payable (in Words): {amountInWords}</p>

              {formData.termsConditions && (
                <div className="mb-8">
                  <h3 className="font-bold text-sm mb-2">TERMS & CONDITIONS:</h3>
                  <p className="text-xs whitespace-pre-line">{formData.termsConditions}</p>
                </div>
              )}

              <div className="text-right mt-16">
                <p className="mb-8">For ADISEN TECH PVT LTD</p>
                <p className="text-sm">Authorised Signatory</p>
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
