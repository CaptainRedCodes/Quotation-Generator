'use client'

import { useState } from 'react'
import { Loader2, X, Plus } from 'lucide-react'
import { formatIndianCurrency } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/constants'

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

  // Multiple TO recipients
  const [toList, setToList] = useState<string[]>(to ? [to] : [''])
  // Multiple CC recipients
  const [ccList, setCcList] = useState<string[]>([''])

  const [subject, setSubject] = useState(`Quotation ${quotationNo} from Adisen Tech Pvt Ltd`)
  const [message, setMessage] = useState(
`Dear Sir/Madam,

Please find attached the quotation ${quotationNo} dated ${date} for your reference.

Subtotal: ₹${formatIndianCurrency(subtotal)}
GST (${APP_CONFIG.defaultGstPercent}%): ₹${formatIndianCurrency(gst)}
Total: ₹${formatIndianCurrency(total)}

Please feel free to reach out for any queries.

Warm regards,
${userName}
Adisen Tech Pvt Ltd`
  )

  const updateList = (
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string
  ) => {
    const updated = [...list]
    updated[index] = value
    setList(updated)
  }

  const addToField = () => setToList([...toList, ''])
  const removeToField = (i: number) => setToList(toList.filter((_, idx) => idx !== i))

  const addCcField = () => setCcList([...ccList, ''])
  const removeCcField = (i: number) => setCcList(ccList.filter((_, idx) => idx !== i))

  const handleSend = async () => {
    setError(null)

    const validTo = toList.map(e => e.trim()).filter(Boolean)
    const validCc = ccList.map(e => e.trim()).filter(Boolean)

    if (validTo.length === 0) {
      setError('At least one recipient email is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const allEmails = [...validTo, ...validCc]
    const invalid = allEmails.find(e => !emailRegex.test(e))
    if (invalid) {
      setError(`Invalid email address: ${invalid}`)
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId,
          to: validTo,
          cc: validCc.length > 0 ? validCc : undefined,
          subject,
          message
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
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* TO */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">To *</label>
              <button onClick={addToField} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add recipient
              </button>
            </div>
            <div className="space-y-2">
              {toList.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateList(toList, setToList, i, e.target.value)}
                    placeholder="recipient@email.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {toList.length > 1 && (
                    <button onClick={() => removeToField(i)} className="p-2 text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CC */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">CC <span className="text-slate-400 font-normal">(optional)</span></label>
              <button onClick={addCcField} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add CC
              </button>
            </div>
            <div className="space-y-2">
              {ccList.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateList(ccList, setCcList, i, e.target.value)}
                    placeholder="cc@email.com (optional)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button onClick={() => removeCcField(i)} className="p-2 text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={10}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50 flex items-center gap-2 text-sm"
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