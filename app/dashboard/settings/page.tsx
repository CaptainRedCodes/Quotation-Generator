'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Save, User, Building, FileText, Mail, AlertCircle } from 'lucide-react'

interface CompanySettings {
  id: string
  companyName: string
  address: string
  gstNo: string
  panNo: string
  emailFrom: string
  termsConditions: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

type Tab = 'company' | 'users' | 'templates' | 'email'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const [settings, setSettings] = useState<CompanySettings>({
    id: '',
    companyName: '',
    address: '',
    gstNo: '',
    panNo: '',
    emailFrom: '',
    termsConditions: ''
  })

  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [testEmailSending, setTestEmailSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      
      if (data.settings) {
        setSettings(data.settings)
      }
      setUsers(data.users)
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
      const res = await fetch('/api/settings', {
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
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Email from Adisen Tech Quotation System',
          message: 'This is a test email to verify Resend configuration.'
        })
      })

      if (res.ok) {
        setSuccess('Test email sent! Check your inbox.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to send test email. Check your Resend API key.')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      setError(error instanceof Error ? error.message : 'Error sending test email.')
    } finally {
      setTestEmailSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    )
  }

  const tabs = [
    { id: 'company' as Tab, label: 'Company Details', icon: Building },
    { id: 'users' as Tab, label: 'Users', icon: User },
    { id: 'templates' as Tab, label: 'Templates', icon: FileText },
    { id: 'email' as Tab, label: 'Email', icon: Mail }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-900 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow border border-slate-200">
          <div className="border-b border-slate-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
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
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={settings.address}
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
                      value={settings.gstNo}
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
                      value={settings.panNo}
                      onChange={(e) => setSettings({ ...settings, panNo: e.target.value })}
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
                    value={settings.emailFrom}
                    onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Manage user accounts. Passwords must be at least 8 characters.
                </p>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                      {user.email !== session?.user?.email && (
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Change Password
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedUser && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-medium mb-2">Change Password for {selectedUser.name}</h3>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                     <div className="flex gap-2">
                       <button
                         onClick={async () => {
                           if (!newPassword || newPassword.length < 8) {
                             setError('Password must be at least 8 characters')
                             return
                           }
                           
                           setChangingPassword(true)
                           setError(null)
                           setSuccess(null)
                           
                           try {
                             const res = await fetch('/api/settings', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({
                                 userId: selectedUser.id,
                                 password: newPassword
                               })
                             })

                             if (res.ok) {
                               setSuccess(`Password updated successfully for ${selectedUser.name}`)
                               setSelectedUser(null)
                               setNewPassword('')
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
                         className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
                       >
                         {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                         Update Password
                       </button>
                      <button
                        onClick={() => {
                          setSelectedUser(null)
                          setNewPassword('')
                        }}
                        className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Default Terms & Conditions
                  </label>
                  <textarea
                    value={settings.termsConditions}
                    onChange={(e) => setSettings({ ...settings, termsConditions: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={8}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will be the default text for new quotations. Each quotation can be edited individually.
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
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
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Resend Configuration</h3>
                  <p className="text-sm text-blue-800">
                    To configure email, add your Resend API key to the environment variable:
                  </p>
                  <code className="block mt-2 p-2 bg-white rounded text-sm">
                    RESEND_API_KEY=re_123456789
                  </code>
                  <p className="text-xs text-blue-600 mt-2">
                    Sign up at resend.com to get a free API key (3000 emails/month free)
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
                  Test email will be sent to the configured sender address.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
