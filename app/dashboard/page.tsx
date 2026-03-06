'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Search, Eye, FileDown, Trash2, FileText, Receipt, AlertCircle, Building2, ChevronLeft, ChevronRight, Filter, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { formatIndianCurrency, formatDate } from '@/lib/utils'
import { useOrg } from '@/components/OrgContext'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Quotation {
  id: string
  quotationNo: string
  date: string | Date
  toCompanyName: string
  subtotal: number
  discountType: string | null
  discountValue: number | null
  discountAmount: number | null
  gstPercent: number
  gstAmount: number
  totalAmount: number
  status: string
}

interface Invoice {
  id: string
  invoiceNo: string
  invoiceDate: string | Date
  toCompanyName: string
  totalAmount: number
  status: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

const QUOTATION_STATUSES = ['draft', 'sent', 'accepted']
const INVOICE_STATUSES = ['pending', 'paid', 'overdue']

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { activeOrg, userRole, loading: orgLoading, orgFetch } = useOrg()
  const [activeTab, setActiveTab] = useState<'quotations' | 'invoices'>('quotations')
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [settingsMissing, setSettingsMissing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean
    type: 'quotation' | 'invoice' | null
    id: string
    no: string
  }>({ isOpen: false, type: null, id: '', no: '' })
  const [isConfirming, setIsConfirming] = useState(false)
  const [actionLoading, setActionLoading] = useState<{ id: string, action: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Confirm-quotation dialog state
  const [confirmQuotationDialog, setConfirmQuotationDialog] = useState<{
    isOpen: boolean
    id: string
    no: string
  }>({ isOpen: false, id: '', no: '' })
  const [isConfirmingQuotation, setIsConfirmingQuotation] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && activeOrg && userRole === 'EMPLOYEE') {
      loadData()
    } else if (status === 'authenticated' && !orgLoading) {
      setLoading(false)
    }
  }, [status, activeOrg, userRole, orgLoading])

  useEffect(() => {
    if (activeOrg && userRole === 'EMPLOYEE') {
      loadData()
    }
  }, [pagination.page, activeTab])

  async function loadData() {
    if (!activeOrg) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())
      if (searchTerm) params.set('search', searchTerm)
      if (statusFilter) params.set('status', statusFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const [qRes, iRes, sRes] = await Promise.all([
        orgFetch(`/api/quotations?${params.toString()}`),
        orgFetch(`/api/invoices?${params.toString()}`),
        orgFetch('/api/settings')
      ])

      const qData = qRes.ok ? await qRes.json() : { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      const iData = iRes.ok ? await iRes.json() : { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      const sData = sRes.ok ? await sRes.json() : null

      setQuotations(qData.data || [])
      setInvoices(iData.data || [])

      if (activeTab === 'quotations') {
        setPagination(qData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
      } else {
        setPagination(iData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
      }

      if (!sData?.settings?.companyName) setSettingsMissing(true)
    } catch (e) {
      console.error(e)
      setQuotations([])
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    loadData()
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPagination(prev => ({ ...prev, page: 1 }))
    loadData()
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const downloadPDF = async (id: string, no: string, type: 'quotation' | 'invoice') => {
    setActionLoading({ id, action: 'download' })
    try {
      const url = type === 'quotation' ? '/api/pdf/generate' : '/api/pdf/generate-invoice'
      const res = await orgFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type + 'Id']: id })
      })
      if (!res.ok) return alert('Failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${type}-${no}.pdf`
      a.click()
    } finally {
      setActionLoading(null)
    }
  }

  const confirmDelete = (id: string, no: string, type: 'quotation' | 'invoice') => {
    setConfirmAction({ isOpen: true, type, id, no })
  }

  const executeDelete = async () => {
    setIsConfirming(true)
    const { id, type } = confirmAction
    try {
      const res = await orgFetch(`/api/${type}s/${id}`, { method: 'DELETE' })
      if (!res.ok) return alert('Failed')
      loadData()
    } finally {
      setIsConfirming(false)
      setConfirmAction({ isOpen: false, type: null, id: '', no: '' })
    }
  }

  // ── Confirm quotation (draft → sent) ───────────────────────────────────────
  const handleConfirmQuotation = async () => {
    setIsConfirmingQuotation(true)
    try {
      const res = await orgFetch(`/api/quotations/${confirmQuotationDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' })
      })
      if (res.ok) {
        setQuotations(prev =>
          prev.map(q =>
            q.id === confirmQuotationDialog.id ? { ...q, status: 'sent' } : q
          )
        )
      } else {
        alert('Failed to confirm quotation')
      }
    } catch {
      alert('Failed to confirm quotation')
    } finally {
      setIsConfirmingQuotation(false)
      setConfirmQuotationDialog({ isOpen: false, id: '', no: '' })
    }
  }

  if (loading || orgLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )

  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-gray-900 mb-1">No organization selected</h2>
          <p className="text-sm text-gray-500 mb-4">Select or create an organization to get started.</p>
          <Link href="/dashboard/organizations" className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800">
            Go to Organizations
          </Link>
        </main>
      </div>
    )
  }

  if (activeOrg.role === 'ORG_ADMIN') {
    router.replace('/dashboard/organizations')
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  const tabs = [
    { id: 'quotations' as const, label: 'Quotations', icon: FileText },
    { id: 'invoices' as const, label: 'Invoices', icon: Receipt },
  ]

  const handleTabChange = (tabId: 'quotations' | 'invoices') => {
    setActiveTab(tabId)
    setPagination(prev => ({ ...prev, page: 1 }))
    setSearchTerm('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const statuses = activeTab === 'quotations' ? QUOTATION_STATUSES : INVOICE_STATUSES

  // Add this useEffect near the top with the other useEffects
  useEffect(() => {
    if (status === 'authenticated' && userRole === 'ORG_ADMIN') {
      router.replace('/dashboard/organizations')
    }
  }, [status, userRole, router])
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={confirmAction.isOpen}
        title={`Delete ${confirmAction.type === 'quotation' ? 'Quotation' : 'Invoice'}`}
        message={`Are you sure you want to delete ${confirmAction.type} ${confirmAction.no}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmAction({ isOpen: false, type: null, id: '', no: '' })}
        isLoading={isConfirming}
        variant="danger"
      />

      {/* Confirm-quotation dialog */}
      <ConfirmDialog
        isOpen={confirmQuotationDialog.isOpen}
        title="Confirm Quotation"
        message={`Mark quotation ${confirmQuotationDialog.no} as confirmed and send it to the client?`}
        confirmText="Confirm Quotation"
        onConfirm={handleConfirmQuotation}
        onCancel={() => setConfirmQuotationDialog({ isOpen: false, id: '', no: '' })}
        isLoading={isConfirmingQuotation}
        variant="info"
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {settingsMissing && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Company details not configured</p>
              <p className="text-sm text-yellow-700">Please add your company information before creating quotations.</p>
            </div>
            <Link href="/dashboard/settings" className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600">
              Configure
            </Link>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          {activeTab === 'quotations' && (
            <Link href="/dashboard/quotation/new" className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm rounded-md">
              <Plus className="w-4 h-4" /> New
            </Link>
          )}
        </div>

        <div className="bg-white border rounded-lg">
          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px ${activeTab === t.id ? 'border-black text-black' : 'border-transparent text-gray-500'}`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1 px-3 py-2 border rounded-md text-sm ${showFilters ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                >
                  <Filter className="w-4 h-4" /> Filters
                </button>
              </div>
              {(searchTerm || statusFilter || dateFrom || dateTo) && (
                <button onClick={handleClearFilters} className="text-sm text-red-600 hover:text-red-800">Clear</button>
              )}
            </div>

            {showFilters && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All Status</option>
                  {statuses.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-md text-sm" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-md text-sm" />
                <button onClick={handleSearch} className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800">Apply</button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">No.</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Client</th>
                  {activeTab === 'quotations' && (
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Subtotal</th>
                  )}
                  {activeTab === 'quotations' && (
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Discount</th>
                  )}
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Total</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeTab === 'quotations' ? (
                  quotations.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No quotations</td></tr>
                  ) : (
                    quotations.map(q => (
                      <tr
                        key={q.id}
                        onClick={() => router.push(`/dashboard/quotation/${q.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium">{q.quotationNo}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(new Date(q.date))}</td>
                        <td className="px-4 py-3">{q.toCompanyName}</td>

                        {/* Subtotal */}
                        <td className="px-4 py-3 text-gray-500">{formatIndianCurrency(q.subtotal ?? q.totalAmount)}</td>

                        {/* Discount */}
                        <td className="px-4 py-2">
                          {q.discountAmount && q.discountAmount > 0 ? (
                            <span className="text-red-600 font-medium">
                              −{formatIndianCurrency(q.discountAmount)}
                              {q.discountType === 'percentage' && q.discountValue
                                ? <span className="text-xs text-red-400 ml-1">({q.discountValue}%)</span>
                                : null}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Total (after discount + GST) */}
                        <td className="px-4 py-2 font-semibold">{formatIndianCurrency(q.totalAmount)}</td>

                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${q.status === 'sent' ? 'bg-green-100 text-green-700' :
                            q.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{q.status}</span>
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 items-center justify-end">
                            {/* Confirm button — only for draft quotations */}
                            {q.status === 'draft' && (
                              <button
                                title="Confirm quotation"
                                onClick={() => setConfirmQuotationDialog({ isOpen: true, id: q.id, no: q.quotationNo })}
                                className="p-1 hover:bg-green-50 text-green-600 rounded"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <Link href={`/dashboard/quotation/${q.id}`} className="p-1 hover:bg-gray-100 rounded" title="View">
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              disabled={actionLoading?.id === q.id && actionLoading?.action === 'download'}
                              onClick={() => downloadPDF(q.id, q.quotationNo, 'quotation')}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                              title="Download PDF"
                            >
                              {actionLoading?.id === q.id && actionLoading?.action === 'download'
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <FileDown className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => confirmDelete(q.id, q.quotationNo, 'quotation')}
                              className="p-1 hover:bg-red-50 text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  invoices.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No invoices</td></tr>
                  ) : (
                    invoices.map(i => (
                      <tr
                        key={i.id}
                        onClick={() => router.push(`/dashboard/invoice/${i.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium">{i.invoiceNo}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(new Date(i.invoiceDate))}</td>
                        <td className="px-4 py-3">{i.toCompanyName}</td>
                        <td className="px-4 py-3 font-semibold">{formatIndianCurrency(i.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${i.status === 'paid' ? 'bg-green-100 text-green-700' :
                            i.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{i.status}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Link href={`/dashboard/invoice/${i.id}`} className="p-1 hover:bg-gray-100 rounded" title="View">
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              disabled={actionLoading?.id === i.id && actionLoading?.action === 'download'}
                              onClick={() => downloadPDF(i.id, i.invoiceNo, 'invoice')}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                              title="Download PDF"
                            >
                              {actionLoading?.id === i.id && actionLoading?.action === 'download'
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <FileDown className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => confirmDelete(i.id, i.invoiceNo, 'invoice')}
                              className="p-1 hover:bg-red-50 text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) pageNum = i + 1
                  else if (pagination.page <= 3) pageNum = i + 1
                  else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                  else pageNum = pagination.page - 2 + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 border rounded text-sm ${pagination.page === pageNum ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}