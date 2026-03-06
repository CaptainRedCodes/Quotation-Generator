'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Save, User, Building, FileText, Mail, AlertCircle, Upload, X } from 'lucide-react'
import { useOrg } from '@/components/OrgContext'

interface CompanySettings {
  id: string
  companyName: string | null
  address: string | null
  gstNo: string | null
  panNo: string | null
  cinNo: string | null
  msmeNo: string | null
  emailFrom: string | null
  termsConditions: string | null
  invoiceTermsConditions: string | null
  quotationTermsConditions: string | null
  signatureImageUrl: string | null
}

type Tab = 'company' | 'account' | 'templates' | 'email'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { orgFetch } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const [settings, setSettings] = useState<CompanySettings>({
    id: '',
    companyName: null,
    address: null,
    gstNo: null,
    panNo: null,
    cinNo: null,
    msmeNo: null,
    emailFrom: null,
    termsConditions: null,
    invoiceTermsConditions: null,
    quotationTermsConditions: null,
    signatureImageUrl: null
  })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [testEmailSending, setTestEmailSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await orgFetch('/api/settings')
      const data = await res.json()

      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const res = await orgFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setSuccess('Settings saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTestEmailSending(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await orgFetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Email from Ledgr Quotation System',
          message: 'This is a test email to verify configuration.'
        })
      })

      if (res.ok) {
        setSuccess('Test email sent! Check your inbox.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to send test email.')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      setError('Error sending test email.')
    } finally {
      setTestEmailSending(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await orgFetch('/api/settings/logo', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setSettings({ ...settings, signatureImageUrl: data.logoUrl })
        setSuccess('Logo uploaded successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to upload logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setError('Failed to upload logo')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'company' as Tab, label: 'Company Details', icon: Building },
    { id: 'account' as Tab, label: 'Account', icon: User },
    { id: 'templates' as Tab, label: 'Templates', icon: FileText },
    { id: 'email' as Tab, label: 'Email(beta)', icon: Mail }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-6">Settings</h1>
        <div className="bg-white rounded-lg shadow border border-slate-200">
          <div className="border-b border-slate-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {activeTab === 'company' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {settings.signatureImageUrl ? (
                      <div className="relative">
                        <img 
                          src={settings.signatureImageUrl} 
                          alt="Company Logo" 
                          className="w-24 h-24 object-contain border border-gray-200 rounded-md"
                        />
                        <button
                          onClick={async () => {
                            setSettings({ ...settings, signatureImageUrl: null })
                            await handleSaveSettings()
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        <Upload className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <label className="cursor-pointer px-4 py-2 bg-blue-700 text-white text-sm rounded-md hover:bg-blue-800">
                        Upload Logo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, SVG (max 2MB)</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.companyName || ''}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={settings.gstNo || ''}
                      onChange={(e) => setSettings({ ...settings, gstNo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={settings.panNo || ''}
                      onChange={(e) => setSettings({ ...settings, panNo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CIN Number
                    </label>
                    <input
                      type="text"
                      value={settings.cinNo || ''}
                      onChange={(e) => setSettings({ ...settings, cinNo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      MSME Number
                    </label>
                    <input
                      type="text"
                      value={settings.msmeNo || ''}
                      onChange={(e) => setSettings({ ...settings, msmeNo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email From Address
                  </label>
                  <input
                    type="email"
                    value={settings.emailFrom || ''}
                    onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Uses SMTP_USER environment variable by default
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Manage your account settings. Passwords must be at least 8 characters.
                </p>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-medium mb-4">Change Your Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setError(null)
                          setSuccess(null)

                          if (!newPassword || newPassword.length < 8) {
                            setError('Password must be at least 8 characters')
                            return
                          }

                          if (newPassword !== confirmPassword) {
                            setError('Passwords do not match')
                            return
                          }

                          setChangingPassword(true)

                          try {
                            const res = await fetch('/api/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                newPassword
                              })
                            })

                            if (res.ok) {
                              setSuccess('Password updated successfully!')
                              setNewPassword('')
                              setConfirmPassword('')
                              setTimeout(() => setSuccess(null), 3000)
                            } else {
                              const data = await res.json()
                              setError(data.error || 'Failed to update password')
                            }
                          } catch (error) {
                            console.error('Error updating password:', error)
                            setError(error instanceof Error ? error.message : 'Failed to update password')
                          } finally {
                            setChangingPassword(false)
                          }
                        }}
                        disabled={changingPassword}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                      >
                        {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quotation Terms & Conditions
                  </label>
                  <textarea
                    value={settings.quotationTermsConditions || ''}
                    onChange={(e) => setSettings({ ...settings, quotationTermsConditions: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Default terms for new quotations. Each quotation can be edited individually.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Invoice Terms & Conditions
                  </label>
                  <textarea
                    value={settings.invoiceTermsConditions || ''}
                    onChange={(e) => setSettings({ ...settings, invoiceTermsConditions: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Default terms for invoices created from quotations.
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Save Templates
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-medium text-green-900 mb-2">Email Configuration (Gmail SMTP)</h3>
                  <p className="text-sm text-green-800">
                    Emails are sent using Gmail SMTP. The sender address is your Gmail address
                    configured in the <code>SMTP_USER</code> environment variable.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Gmail SMTP Setup</h3>
                  <p className="text-sm text-blue-800">
                    Add the following environment variables:
                  </p>
                  <code className="block mt-2 p-2 bg-white rounded text-sm whitespace-pre-wrap">
                    {`SMTP_USER=yourname@gmail.com
SMTP_PASS=your-app-password`}
                  </code>
                  <p className="text-xs text-blue-600 mt-2">
                    Generate an App Password at: Google Account → Security → 2-Step Verification → App Passwords
                  </p>
                </div>

                <button
                  onClick={handleTestEmail}
                  disabled={testEmailSending}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                >
                  {testEmailSending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Test Email
                </button>

                <p className="text-xs text-slate-500">
                  Test email will be sent to verify your Gmail SMTP configuration.
                </p>
                <p className="text-xs text-slate-500"> <>NOTE: This feature is still in development and wont work for a while</> </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
