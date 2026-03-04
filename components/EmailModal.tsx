'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { formatIndianCurrency } from '@/lib/utils'

interface EmailModalProps {
  quotationId: string
  to: string
  quotationNo: string
  date: string
  subtotal: number
  gst: number
  total: number
  userName: string
  onClose: () => void
  onSuccess?: () => void
}

export function EmailModal({
  quotationId,
  to,
  quotationNo,
  date,
  subtotal,
  gst,
  total,
  userName,
  onClose,
  onSuccess
}: EmailModalProps) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    to: to,
    cc: '',
    subject: `Quotation ${quotationNo} from Adisen Tech Pvt Ltd`,
    message: `Dear ${to},

Please find attached the quotation ${quotationNo} dated ${date} for your reference.

Subtotal: ₹${formatIndianCurrency(subtotal)}
GST (18%): ₹${formatIndianCurrency(gst)}
Total: ₹${formatIndianCurrency(total)}

Please feel free to reach out for any queries.

Warm regards,
${userName}
Adisen Tech Pvt Ltd`
  })

  const handleSend = async () => {
    setError(null)
    setSending(true)
    try {
      if (!formData.to) {
        setError('Email address is required')
        return
      }

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId,
          ...formData
        })
      })

      if (res.ok) {
        onSuccess?.()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setError('An error occurred while sending the email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="border-b border-slate-200 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Send Quotation via Email</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To *</label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CC</label>
            <input
              type="email"
              value={formData.cc}
              onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={10}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50 flex items-center gap-2"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
