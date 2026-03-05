'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Search, Eye, FileDown, Trash2, FileText, Receipt, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatIndianCurrency, formatDate } from '@/lib/utils'

interface Quotation {
  id: string
  quotationNo: string
  date: string | Date
  toCompanyName: string
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'quotations' | 'invoices'>('quotations')
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [settingsMissing, setSettingsMissing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') loadData()
  }, [status, router])

  async function loadData() {
    try {
      const [qRes, iRes, sRes] = await Promise.all([
        fetch('/api/quotations'),
        fetch('/api/invoices'),
        fetch('/api/settings')
      ])
      
      const qData = qRes.ok ? await qRes.json() : []
      const iData = iRes.ok ? await iRes.json() : []
      const sData = sRes.ok ? await sRes.json() : null
      
      if (!qRes.ok) console.error('Failed to fetch quotations:', qRes.status)
      if (!iRes.ok) console.error('Failed to fetch invoices:', iRes.status)
      
      setQuotations(qData)
      setInvoices(iData)
      filterQuotations(qData, '')
      filterInvoices(iData, '')
      
      if (!sData?.settings?.companyName) {
        setSettingsMissing(true)
      }
    } catch (e) {
      console.error(e)
      setQuotations([])
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  function filterQuotations(list: Quotation[], term: string) {
    setFilteredQuotations(list.filter(q =>
      q.quotationNo.toLowerCase().includes(term.toLowerCase()) ||
      q.toCompanyName.toLowerCase().includes(term.toLowerCase())
    ))
  }

  function filterInvoices(list: Invoice[], term: string) {
    setFilteredInvoices(list.filter(i =>
      i.invoiceNo.toLowerCase().includes(term.toLowerCase()) ||
      i.toCompanyName.toLowerCase().includes(term.toLowerCase())
    ))
  }

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    setSearchTerm(t)
    activeTab === 'quotations' ? filterQuotations(quotations, t) : filterInvoices(invoices, t)
  }

  const downloadPDF = async (id: string, no: string, type: 'quotation' | 'invoice') => {
    const url = type === 'quotation' ? '/api/pdf/generate' : '/api/pdf/generate-invoice'
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [type + 'Id']: id }) })
    if (!res.ok) return alert('Failed')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${type}-${no}.pdf`
    a.click()
  }

  const del = async (id: string, type: 'quotation' | 'invoice') => {
    if (!confirm('Delete?')) return
    const res = await fetch(`/api/${type}s/${id}`, { method: 'DELETE' })
    if (!res.ok) return alert('Failed')
    if (type === 'quotation') {
      setQuotations(quotations.filter(q => q.id !== id))
      filterQuotations(quotations.filter(q => q.id !== id), searchTerm)
    } else {
      setInvoices(invoices.filter(i => i.id !== id))
      filterInvoices(invoices.filter(i => i.id !== id), searchTerm)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>

  const tabs = [
    { id: 'quotations' as const, label: 'Quotations', icon: FileText },
    { id: 'invoices' as const, label: 'Invoices', icon: Receipt },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="flex border-b">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setSearchTerm('') }}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px ${
                  activeTab === t.id ? 'border-black text-black' : 'border-transparent text-gray-500'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={onSearch}
              className="w-full max-w-xs px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">No.</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Client</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeTab === 'quotations' ? (
                  filteredQuotations.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No quotations</td></tr>
                  ) : (
                    filteredQuotations.map(q => (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{q.quotationNo}</td>
                        <td className="px-4 py-2 text-gray-600">{formatDate(new Date(q.date))}</td>
                        <td className="px-4 py-2">{q.toCompanyName}</td>
                        <td className="px-4 py-2 font-medium">₹{formatIndianCurrency(q.totalAmount)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            q.status === 'sent' ? 'bg-green-100 text-green-700' :
                            q.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{q.status}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Link href={`/dashboard/quotation/${q.id}`} className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></Link>
                            <button onClick={() => downloadPDF(q.id, q.quotationNo, 'quotation')} className="p-1 hover:bg-gray-100 rounded"><FileDown className="w-4 h-4" /></button>
                            <button onClick={() => del(q.id, 'quotation')} className="p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  filteredInvoices.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No invoices</td></tr>
                  ) : (
                    filteredInvoices.map(i => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{i.invoiceNo}</td>
                        <td className="px-4 py-2 text-gray-600">{formatDate(new Date(i.invoiceDate))}</td>
                        <td className="px-4 py-2">{i.toCompanyName}</td>
                        <td className="px-4 py-2 font-medium">₹{formatIndianCurrency(i.totalAmount)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            i.status === 'paid' ? 'bg-green-100 text-green-700' :
                            i.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{i.status}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Link href={`/dashboard/invoice/${i.id}`} className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></Link>
                            <button onClick={() => downloadPDF(i.id, i.invoiceNo, 'invoice')} className="p-1 hover:bg-gray-100 rounded"><FileDown className="w-4 h-4" /></button>
                            <button onClick={() => del(i.id, 'invoice')} className="p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
