'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Search, Eye, FileDown, Mail, Trash2 } from 'lucide-react'
import NavBar from '@/components/NavBar'
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, sent: 0, draft: 0 })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadData()
    }
  }, [status, router])

  async function loadData() {
    try {
      const res = await fetch('/api/quotations')
      const data = await res.json()
      setQuotations(data)
      filterQuotations(data, '')
      calculateStats(data)
    } catch (error) {
      console.error('Error loading quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(quotationList: Quotation[]) {
    const total = quotationList.length
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    let thisMonth = 0
    let sent = 0
    let draft = 0

    quotationList.forEach(q => {
      const qDate = new Date(q.date)
      if (qDate >= startOfMonth) thisMonth++
      if (q.status === 'sent') sent++
      if (q.status === 'draft') draft++
    })

    setStats({ total, thisMonth, sent, draft })
  }

  function filterQuotations(quotationList: Quotation[], term: string) {
    const filtered = quotationList.filter(q =>
      q.quotationNo.toLowerCase().includes(term.toLowerCase()) ||
      q.toCompanyName.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredQuotations(filtered)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    filterQuotations(quotations, term)
  }

  const handleDownloadPDF = async (quotationId: string, quotationNo: string) => {
    try {
      const pdfRes = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotationId })
      })

      if (!pdfRes.ok) throw new Error('Failed to generate PDF')

      const blob = await pdfRes.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotationNo}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const handleSendEmail = (quotationId: string) => {
    // This would typically open a modal or navigate to email view
    // For now, navigate to the quotation edit page where they can send from there
    router.push(`/dashboard/quotation/${quotationId}`)
  }

  const handleDelete = async (quotationId: string) => {
    if (!confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setQuotations(quotations.filter(q => q.id !== quotationId))
        filterQuotations(quotations.filter(q => q.id !== quotationId), searchTerm)
      } else {
        alert('Failed to delete quotation')
      }
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('Failed to delete quotation')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <Link
            href="/dashboard/quotation/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <p className="text-sm text-slate-500">Total Quotations</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <p className="text-sm text-slate-500">This Month</p>
            <p className="text-2xl font-bold text-slate-800">{stats.thisMonth}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <p className="text-sm text-slate-500">Sent</p>
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <p className="text-sm text-slate-500">Draft</p>
            <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by client name or quotation number..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">No.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      {quotations.length === 0 
                        ? 'No quotations yet. Create your first quotation!'
                        : 'No quotations match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {quotation.quotationNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(new Date(quotation.date))}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {quotation.toCompanyName}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        ₹{formatIndianCurrency(quotation.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          quotation.status === 'sent' 
                            ? 'bg-green-100 text-green-800'
                            : quotation.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/quotation/${quotation.id}`}
                            className="p-1 text-slate-600 hover:text-slate-800"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDownloadPDF(quotation.id, quotation.quotationNo)}
                            className="p-1 text-slate-600 hover:text-slate-800"
                            title="Download PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendEmail(quotation.id)}
                            className="p-1 text-slate-600 hover:text-slate-800"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(quotation.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
