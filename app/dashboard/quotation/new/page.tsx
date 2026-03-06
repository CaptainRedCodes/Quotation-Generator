'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Trash2, Save, FileDown, X, AlertCircle } from 'lucide-react'
import { formatIndianCurrency, amountToWords, generateQuotationNo, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useOrg } from '@/components/OrgContext'
import { validateGst, validateMobile, validateEmailRegex } from '@/lib/validation'

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

interface CompanySettings {
  id?: string
  organizationId?: string
  companyName: string | null
  address: string | null
  gstNo: string | null
  panNo: string | null
  cinNo: string | null
  msmeNo: string | null
  emailFrom: string | null
  signatureImageUrl: string | null
  quotationTermsConditions: string | null
}

export default function NewQuotationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { orgFetch, activeOrg } = useOrg()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [shakeButton, setShakeButton] = useState(false)
  const [isSavedLock, setIsSavedLock] = useState(false)

  const [qState, setQState] = useState({
    toCompanyName: '',
    toAddress: '',
    toGstNo: '',
    toPhone: '',
    toEmail: '',
    quotationNo: '',
    date: new Date(),
    gstType: 'igst'
  })
  const qStateRef = useRef(qState)
  useEffect(() => { qStateRef.current = qState }, [qState])

  const [termsConditions, setTermsConditions] = useState('')
  const termsConditionsRef = useRef(termsConditions)
  useEffect(() => { termsConditionsRef.current = termsConditions }, [termsConditions])

  // Discount & GST state + refs so handleSave always reads latest values
  const [discountConfig, setDiscountConfig] = useState<{ type: 'percentage' | 'fixed', value: number }>({ type: 'percentage', value: 0 })
  const [gstPercent, setGstPercent] = useState<number>(18)
  const discountConfigRef = useRef(discountConfig)
  const gstRateRef = useRef(gstPercent)
  useEffect(() => { discountConfigRef.current = discountConfig }, [discountConfig])
  useEffect(() => { gstRateRef.current = gstPercent }, [gstPercent])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [items, setItems] = useState<QuotationItem[]>([])
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  useEffect(() => {
    async function loadData() {
      try {
        const [productsRes, settingsRes] = await Promise.all([
          orgFetch('/api/products'),
          orgFetch('/api/settings')
        ])
        const productsData = await productsRes.json()
        const settingsData = await settingsRes.json()
        if (Array.isArray(productsData)) setProducts(productsData)
        if (settingsData.settings) {
          setCompanySettings(settingsData.settings)
          setTermsConditions(
            settingsData.settings.quotationTermsConditions ||
            settingsData.settings.termsConditions || ''
          )
        }

        // Handle both flat-array and paginated { data: [] } API shapes
        const lastQuotationRes = await orgFetch('/api/quotations?page=1&limit=1')
        const lastQuotationData = await lastQuotationRes.json()
        const quotationsList = Array.isArray(lastQuotationData)
          ? lastQuotationData
          : (lastQuotationData.data ?? [])
        const lastNo = quotationsList.length > 0 ? quotationsList[0].quotationNo : null
        setQState((prev) => ({
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

  // Derived financials
  const deriveFinancials = () => {
    const freshSubtotal = items.reduce((sum, item) => sum + (item.isProductHeader ? 0 : item.totalPrice), 0)
    const freshDiscountAmount = discountConfig.type === 'percentage'
      ? freshSubtotal * (discountConfig.value / 100)
      : Math.min(discountConfig.value, freshSubtotal)
    const freshAfterDiscount = freshSubtotal - freshDiscountAmount
    const freshGstAmount = freshAfterDiscount * (gstPercent / 100)
    const freshTotalAmount = freshAfterDiscount + freshGstAmount

    return {
      subtotal: freshSubtotal,
      discountAmount: freshDiscountAmount,
      afterDiscount: freshAfterDiscount,
      gstAmount: freshGstAmount,
      cgstAmount: qState.gstType === 'cgst_sgst' ? freshGstAmount / 2 : 0,
      sgstAmount: qState.gstType === 'cgst_sgst' ? freshGstAmount / 2 : 0,
      igstAmount: qState.gstType === 'igst' ? freshGstAmount : 0,
      totalAmount: freshTotalAmount
    }
  }

  const markDirty = () => { setSavedQuotationId(null); setSaveSuccess(false) }

  const handleAddProduct = (product: Product) => {
    const newItems: QuotationItem[] = [
      { id: `header-${product.id}-${Date.now()}`, componentName: product.name, sacCode: null, quantity: 0, unitPrice: 0, totalPrice: 0, isProductHeader: true },
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
    setItems(prev => [...prev, ...newItems])
    markDirty()
  }

  const handleAddCustomItem = () => {
    setItems(prev => [...prev, { id: `custom-${Date.now()}`, componentName: '', sacCode: '', quantity: 1, unitPrice: 0, totalPrice: 0, isProductHeader: false }])
    markDirty()
  }

  const handleUpdateItem = (id: string, field: string, value: string | number | boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.totalPrice = Number(updated.quantity) * Number(updated.unitPrice)
      }
      return updated
    }))
    markDirty()
  }

  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find(item => item.id === id)
    if (itemToDelete?.isProductHeader) {
      const headerIndex = items.findIndex(item => item.id === id)
      const relatedIds = new Set<string>([id])
      for (let i = headerIndex + 1; i < items.length; i++) {
        if (items[i].isProductHeader) break
        relatedIds.add(items[i].id)
      }
      setItems(prev => prev.filter(item => !relatedIds.has(item.id)))
    } else {
      setItems(prev => prev.filter(item => item.id !== id))
    }
    markDirty()
  }

  // GST detection based on Org vs Client state code (first 2 digits)
  const applyGSTTypeCheck = () => {
    const val = qState.toGstNo || ''
    if (val.length >= 2 && companySettings?.gstNo && companySettings.gstNo.length >= 2) {
      const clientStateCode = val.substring(0, 2).toUpperCase()
      const orgStateCode = companySettings.gstNo.substring(0, 2).toUpperCase()
      setQState(prev => ({
        ...prev,
        gstType: clientStateCode === orgStateCode ? 'cgst_sgst' : 'igst'
      }))
    } else {
      setQState(prev => ({ ...prev, gstType: 'igst' }))
    }
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!qState.toCompanyName.trim()) newErrors.toCompanyName = "Company Name is required"
    if (!qState.toAddress.trim()) newErrors.toAddress = "Address is required"

    const gstErr = validateGst(qState.toGstNo);
    if (gstErr) newErrors.toGstNo = gstErr;

    const phoneErr = validateMobile(qState.toPhone);
    if (phoneErr) newErrors.toPhone = phoneErr;

    const emailErr = validateEmailRegex(qState.toEmail);
    if (emailErr) newErrors.toEmail = emailErr;

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 500);
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return false
    }
    return true
  }

  // Save — reads from refs to avoid stale closures, recomputes financials fresh
  const handleSave = async (status: 'draft' | 'sent' | 'accepted' = 'sent') => {
    if (!validateForm()) return

    setSaving(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const curItems = itemsRef.current
      const curDiscountConfig = discountConfigRef.current
      const curGstRate = gstRateRef.current
      const curQState = qStateRef.current
      const curTermsConditions = termsConditionsRef.current

      const financials = deriveFinancials()

      const validItems = curItems.filter(item => item.isProductHeader || item.componentName)
      const cleanItems = validItems.map(({ id, ...rest }) => rest) // Remove client-side 'id'

      const payload = {
        ...curQState,
        date: curQState.date.toISOString(), // Convert Date object to ISO string for backend
        status,
        discountType: curDiscountConfig.type,
        discountValue: curDiscountConfig.value,
        termsConditions: curTermsConditions,
        subtotal: parseFloat(financials.subtotal.toFixed(2)),
        discountAmount: parseFloat(financials.discountAmount.toFixed(2)),
        gstPercent: curGstRate,
        gstAmount: parseFloat(financials.gstAmount.toFixed(2)),
        cgstAmount: parseFloat(financials.cgstAmount.toFixed(2)),
        sgstAmount: parseFloat(financials.sgstAmount.toFixed(2)),
        igstAmount: parseFloat(financials.igstAmount.toFixed(2)),
        totalAmount: parseFloat(financials.totalAmount.toFixed(2)),
        items: cleanItems
      }

      const res = await orgFetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save quotation')
        return
      }

      const data = await res.json()
      setSavedQuotationId(data.id)
      setSaveSuccess(true)
      setIsSavedLock(true)

      // If saving as draft, keep them on the page. Otherwise, maybe redirect.
      if (status !== 'draft') {
        router.push('/dashboard/quotation')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!savedQuotationId) return
    setDownloading(true)
    try {
      const res = await orgFetch(`/api/quotations/${savedQuotationId}/pdf`)
      if (!res.ok) throw new Error('Failed to download PDF')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${qState.quotationNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>

  const isSaved = !!savedQuotationId
  const financials = deriveFinancials()

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

          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {isSavedLock && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <p className="text-green-800 text-sm font-medium">✓ Saved — click Edit to make changes</p>
            <button onClick={() => setIsSavedLock(false)} className="px-4 py-1.5 bg-white border border-green-300 rounded text-sm text-green-700 hover:bg-green-50">Edit</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Client Details */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Client Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex justify-between">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={qState.toCompanyName}
                    onChange={(e) => {
                      setQState({ ...qState, toCompanyName: e.target.value })
                      if (errors.toCompanyName) setErrors(e => ({ ...e, toCompanyName: '' }))
                      markDirty()
                    }}
                    readOnly={isSavedLock} className={`w-full mt-1 px-3 disabled:bg-gray-50 disabled:cursor-not-allowed ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''} py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.toCompanyName ? 'border-red-500' : ''}`}
                    placeholder="Client Company Name"
                  />
                  {errors.toCompanyName && <p className="text-red-500 text-xs mt-1">{errors.toCompanyName}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex justify-between">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={qState.toAddress}
                    onChange={(e) => {
                      setQState({ ...qState, toAddress: e.target.value })
                      if (errors.toAddress) setErrors(e => ({ ...e, toAddress: '' }))
                      markDirty()
                    }}
                    rows={2}
                    readOnly={isSavedLock} className={`w-full mt-1 px-3 disabled:bg-gray-50 disabled:cursor-not-allowed ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''} py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.toAddress ? 'border-red-500' : ''}`}
                    placeholder="Client Address"
                  />
                  {errors.toAddress && <p className="text-red-500 text-xs mt-1">{errors.toAddress}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium flex justify-between items-center text-gray-700">
                    <span>GST Number</span>

                  </label>
                  <input
                    type="text"
                    value={qState.toGstNo || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setQState({ ...qState, toGstNo: val })
                      if (errors.toGstNo) setErrors(err => ({ ...err, toGstNo: '' }))
                      markDirty()

                      // Also apply it directly on change just in case blur misses
                      if (val.length >= 2 && companySettings?.gstNo && companySettings.gstNo.length >= 2) {
                        const clientStateCode = val.substring(0, 2)
                        const orgStateCode = companySettings.gstNo.substring(0, 2).toUpperCase()
                        setQState(prev => ({
                          ...prev,
                          toGstNo: val,
                          gstType: clientStateCode === orgStateCode ? 'cgst_sgst' : 'igst'
                        }))
                      } else {
                        setQState(prev => ({ ...prev, toGstNo: val, gstType: 'igst' }))
                      }
                    }}
                    onBlur={(e) => {
                      applyGSTTypeCheck();
                      const err = validateGst(e.target.value);
                      setErrors(prev => ({ ...prev, toGstNo: err }));
                    }}
                    readOnly={isSavedLock} className={`w-full mt-1 px-3 disabled:bg-gray-50 disabled:cursor-not-allowed ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''} py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.toGstNo ? 'border-red-500' : ''}`}
                    placeholder="e.g. 27AAAAA0000A0A0"
                  />
                  {errors.toGstNo && <p className="text-red-500 text-xs mt-1">{errors.toGstNo}</p>}
                  {!errors.toGstNo && <div className="mt-1 min-h-[20px]">
                    {qState.toGstNo && qState.toGstNo.length >= 2 && companySettings?.gstNo ? (
                      qState.gstType === 'cgst_sgst' ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Intra-state · CGST + SGST will apply</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Inter-state · IGST will apply</span>
                      )
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">GST number not provided · defaulting to IGST</span>
                    )}
                  </div>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={qState.toPhone || ''}
                    onChange={(e) => {
                      setQState({ ...qState, toPhone: e.target.value })
                      if (errors.toPhone) setErrors(err => ({ ...err, toPhone: '' }))
                      markDirty()
                    }}
                    readOnly={isSavedLock} className={`w-full mt-1 px-3 disabled:bg-gray-50 disabled:cursor-not-allowed ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''} py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.toPhone ? 'border-red-500' : ''}`}
                    placeholder="Phone (optional)"
                  />
                  {errors.toPhone && <p className="text-red-500 text-xs mt-1">{errors.toPhone}</p>}
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={qState.toEmail || ''}
                    onChange={(e) => {
                      setQState({ ...qState, toEmail: e.target.value })
                      if (errors.toEmail) setErrors(err => ({ ...err, toEmail: '' }))
                      markDirty()
                    }}
                    readOnly={isSavedLock} className={`w-full mt-1 px-3 disabled:bg-gray-50 disabled:cursor-not-allowed ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''} py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.toEmail ? 'border-red-500' : ''}`}
                    placeholder="Email (optional)"
                  />
                  {errors.toEmail && <p className="text-red-500 text-xs mt-1">{errors.toEmail}</p>}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Products</h2>
                <div className="flex gap-2">
                  <select onChange={(e) => { const product = products.find(p => p.id === e.target.value); if (product) handleAddProduct(product); e.target.value = '' }} className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="">
                    <option value="" disabled>Add Product</option>
                    {products.filter(p => p.active).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <button onClick={handleAddCustomItem} className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50">
                    <Plus className="w-4 h-4" /> Add Item
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
                            <input type="text" value={item.componentName} onChange={(e) => handleUpdateItem(item.id, 'componentName', e.target.value)} className={`w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.isProductHeader ? 'font-bold bg-transparent' : ''}`} readOnly={item.isProductHeader || isSavedLock} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={item.sacCode || ''} onChange={(e) => handleUpdateItem(item.id, 'sacCode', e.target.value)} className={`w-full px-2 py-1 ${isSavedLock ? 'bg-gray-50' : ''} border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500`} readOnly={item.isProductHeader || isSavedLock} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={item.isProductHeader ? '' : item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className={`w-full px-2 py-1 ${isSavedLock ? 'bg-gray-50' : ''} border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500`} readOnly={item.isProductHeader || isSavedLock} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={item.isProductHeader ? '' : item.unitPrice} onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className={`w-full px-2 py-1 ${isSavedLock ? 'bg-gray-50' : ''} border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500`} readOnly={item.isProductHeader || isSavedLock} />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{item.isProductHeader ? '' : formatIndianCurrency(item.totalPrice)}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            No items added. Select a product or add a custom item.
                          </td>
                        </tr>
                      )}
                      {items.length > 0 && (
                        <tr className="bg-gray-50 font-semibold border-t">
                          <td colSpan={5} className="py-3 px-4 text-right">Items Subtotal:</td>
                          <td className="py-3 px-4">{formatIndianCurrency(financials.subtotal)}</td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Terms & Conditions</h2>
              <textarea value={termsConditions} onChange={(e) => { setTermsConditions(e.target.value); markDirty() }} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={4} />
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quotation No.</label>
                  <input type="text" value={qState.quotationNo} onChange={(e) => { setQState({ ...qState, quotationNo: e.target.value }); markDirty() }} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={qState.date instanceof Date ? qState.date.toISOString().split('T')[0] : qState.date as unknown as string}
                    onChange={(e) => { setQState({ ...qState, date: new Date(e.target.value) }); markDirty() }}
                    className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {/* Discount controls */}
              <div className="border-t border-slate-200 pt-4 mb-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Discount</p>
                <div className="flex gap-2">
                  <select value={discountConfig.type} onChange={(e) => { setDiscountConfig({ ...discountConfig, type: e.target.value as 'percentage' | 'fixed' }); markDirty() }} className="px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="percentage">%</option>
                    <option value="fixed">₹</option>
                  </select>
                  <input type="number" min={0} value={discountConfig.value} readOnly={isSavedLock}
                    onChange={(e) => {
                      let val = parseFloat(e.target.value) || 0;
                      if (discountConfig.type === 'percentage') val = Math.min(val, 100);
                      else {
                        const freshSubtotal = items.reduce((sum, item) => sum + (item.isProductHeader ? 0 : item.totalPrice), 0);
                        val = Math.min(val, freshSubtotal);
                      }
                      setDiscountConfig({ ...discountConfig, value: val });
                      markDirty();
                    }}
                    className={`w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''}`} />
                  {((discountConfig.type === 'percentage' && discountConfig.value === 100) || (discountConfig.type === 'fixed' && discountConfig.value > 0 && discountConfig.value === items.reduce((sum, item) => sum + (item.isProductHeader ? 0 : item.totalPrice), 0))) && (
                    <p className="text-xs text-orange-500 col-span-2 mt-1 -ml-4 w-48">Discount cannot exceed subtotal</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST %</label>
                  <select value={gstPercent} disabled={isSavedLock} onChange={(e) => { setGstPercent(parseFloat(e.target.value)); markDirty() }} className={`w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSavedLock ? 'bg-gray-50 cursor-not-allowed' : ''}`}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (default)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">{formatIndianCurrency(deriveFinancials().subtotal)}</span>
                </div>
                {deriveFinancials().discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-600">
                    <span>
                      Discount {discountConfig.type === 'percentage' ? `(${discountConfig.value}%)` : ''}:
                    </span>
                    <span>- {formatIndianCurrency(deriveFinancials().discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Net after Discount:</span>
                  <span className="font-semibold">{formatIndianCurrency(deriveFinancials().afterDiscount)}</span>
                </div>
                {qState.gstType === 'cgst_sgst' ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">CGST ({gstPercent / 2}%):</span>
                      <span>{formatIndianCurrency(deriveFinancials().gstAmount / 2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-slate-600">SGST ({gstPercent / 2}%):</span>
                      <span>{formatIndianCurrency(deriveFinancials().gstAmount / 2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">IGST ({gstPercent}%):</span>
                    <span>{formatIndianCurrency(deriveFinancials().gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="font-bold text-lg text-blue-900">{formatIndianCurrency(deriveFinancials().totalAmount)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-md">
                <p className="text-xs text-slate-600">{amountToWords(deriveFinancials().totalAmount)}</p>
              </div>

              {!isSaved && (
                <button onClick={() => handleSave('draft')} disabled={saving} className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium ${shakeButton ? 'animate-bounce' : ''}`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save as Draft
                </button>
              )}
              {isSaved && (
                <div className="mt-4 space-y-2">
                  <button onClick={handleDownloadPDF} disabled={downloading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium">
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Download PDF
                  </button>
                  <button onClick={() => router.push('/dashboard')} className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 text-center">
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main >

      {/* Preview Modal */}
      {
        showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Quotation Preview</h2>
                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 bg-slate-100">
                <div className="bg-white mx-auto shadow-lg" style={{ maxWidth: 794, padding: '24px 30px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <h1 className="text-center font-bold mb-2" style={{ fontSize: 16, letterSpacing: 2 }}>QUOTATION</h1>
                  <div className="flex border border-black" style={{ minHeight: 60 }}>
                    <div className="border-r border-black flex items-center justify-center" style={{ width: 80, minHeight: 60 }}>
                      {companySettings?.signatureImageUrl ? <img src={companySettings.signatureImageUrl} alt="Logo" style={{ maxWidth: 70, maxHeight: 50, objectFit: 'contain' }} /> : <span style={{ fontSize: 7, color: '#999' }}>Logo</span>}
                    </div>
                    <div className="flex-1 p-1.5 flex flex-col justify-between">
                      <div>
                        <p className="font-bold" style={{ fontSize: 10 }}>{companySettings?.companyName || 'Company Name'}</p>
                        <p style={{ fontSize: 7, marginTop: 1 }}>{companySettings?.address || 'Address not set'}</p>
                      </div>
                      <p style={{ fontSize: 7 }}>GST No. {companySettings?.gstNo || 'N/A'} &nbsp;|&nbsp; PAN: {companySettings?.panNo || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex border-l border-r border-b border-black" style={{ minHeight: 75 }}>
                    <div className="border-r border-black p-1.5 flex flex-col gap-0.5" style={{ width: '55%', fontSize: 7 }}>
                      <p className="font-bold" style={{ fontSize: 8 }}>TO</p>
                      <p className="font-bold" style={{ fontSize: 8 }}>M/S. {qState.toCompanyName || '-'}</p>
                      <p className="whitespace-pre-wrap">{qState.toAddress || '-'}</p>
                      {qState.toGstNo && <p>GST No: {qState.toGstNo}</p>}
                      {qState.toPhone && <p>Phone: {qState.toPhone}</p>}
                    </div>
                    <div className="flex-1 p-1.5 flex flex-col justify-center gap-2" style={{ fontSize: 8 }}>
                      <div className="flex gap-2"><span className="font-bold whitespace-nowrap">QUOTATION NO :</span><span className="font-bold">{qState.quotationNo}</span></div>
                      <div className="flex gap-2"><span className="font-bold whitespace-nowrap">DATE :</span><span className="font-bold">{formatDate(qState.date)}</span></div>
                    </div>
                  </div>
                  <div className="flex border-l border-r border-b border-black font-bold" style={{ fontSize: 7.5 }}>
                    <div className="p-1 border-r border-black" style={{ width: '42%' }}>PARTICULARS</div>
                    <div className="p-1 border-r border-black text-center" style={{ width: '12%' }}>HSN/SAC</div>
                    <div className="p-1 border-r border-black text-center" style={{ width: '8%' }}>Qty</div>
                    <div className="p-1 text-right" style={{ width: '19%' }}>Amount</div>
                  </div>
                  <div className="border-l border-r border-black">
                    {items.filter(i => i.componentName).map((item) => (
                      <div key={item.id} className="flex border-b border-slate-200" style={{ fontSize: 7, minHeight: item.isProductHeader ? 16 : 14 }}>
                        <div className="p-1 border-r border-black" style={{ width: '42%', fontWeight: item.isProductHeader ? 700 : 400, fontSize: item.isProductHeader ? 8 : 7 }}>{item.componentName}</div>
                        <div className="p-1 border-r border-black text-center" style={{ width: '12%' }}>{!item.isProductHeader ? (item.sacCode || '') : ''}</div>
                        <div className="p-1 border-r border-black text-center" style={{ width: '8%' }}>{!item.isProductHeader && item.quantity > 0 ? item.quantity : ''}</div>
                        <div className="p-1.5 text-right" style={{ width: '24%' }}>{!item.isProductHeader && item.totalPrice > 0 ? formatIndianCurrency(item.totalPrice) : ''}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex border-l border-r border-b border-black" style={{ fontSize: 8 }}>
                    <div className="p-1 flex-1 text-right font-semibold">Subtotal</div>
                    <div className="p-1 text-right border-l border-black" style={{ width: '19%' }}>{formatIndianCurrency(deriveFinancials().subtotal)}</div>
                  </div>
                  {deriveFinancials().discountAmount > 0 && (
                    <div className="flex border-l border-r border-b border-black" style={{ fontSize: 8 }}>
                      <div className="p-1 flex-1 text-right font-semibold text-red-700">Discount{discountConfig.type === 'percentage' && discountConfig.value > 0 ? ` (${discountConfig.value}%)` : ''}</div>
                      <div className="p-1 text-right border-l border-black text-red-700" style={{ width: '19%' }}>−{formatIndianCurrency(deriveFinancials().discountAmount)}</div>
                    </div>
                  )}
                  <div className="flex border-l border-r border-b border-black" style={{ fontSize: 8 }}>
                    <div className="p-1 flex-1 font-bold">GST @ {gstPercent}%</div>
                    <div className="p-1 text-right border-l border-black" style={{ width: '19%' }}>{formatIndianCurrency(deriveFinancials().gstAmount)}</div>
                  </div>
                  <div className="flex border-l border-r border-b border-black" style={{ fontSize: 9 }}>
                    <div className="p-1 flex-1 font-bold">Total Payable Amount (in Figures)</div>
                    <div className="p-1 text-right border-l border-black font-bold" style={{ width: '19%' }}>{formatIndianCurrency(deriveFinancials().totalAmount)}</div>
                  </div>

                  <p className="font-bold border border-black p-1.5" style={{ fontSize: 8 }}>
                    Total Amount Payable (in Words)    {amountToWords(deriveFinancials().totalAmount)}
                  </p>
                  {termsConditions && (
                    <div className="border-l border-r border-b border-black p-1.5" style={{ fontSize: 7 }}>
                      <p className="font-bold underline mb-0.5">Terms & Conditions:</p>
                      <div className="whitespace-pre-wrap">
                        {termsConditions.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex border-l border-r border-b border-black" style={{ fontSize: 7, minHeight: 60 }}>
                    <div className="flex-1 border-r border-black p-1.5 flex flex-col justify-end">
                      <p>Receiver's Seal & Sign</p>
                    </div>
                    <div className="flex-1 p-1.5 flex flex-col justify-between items-end text-right">
                      <p className="font-bold">For {companySettings?.companyName}</p>
                      {companySettings?.signatureImageUrl && (
                        <div className="h-8 w-24 relative opacity-80 my-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={companySettings.signatureImageUrl}
                            alt="Signature"
                            className="object-contain h-full w-full"
                          />
                        </div>
                      )}
                      <p>Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div >
  )
}