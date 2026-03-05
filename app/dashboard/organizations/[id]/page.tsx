'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOrg } from '@/components/OrgContext'
import { Loader2, UserPlus, Trash2, Crown, ArrowLeft, Users, Shield, Mail, RefreshCw, X, Copy, Check } from 'lucide-react'

interface Member {
    id: string
    userId: string
    role: 'ORG_ADMIN' | 'EMPLOYEE'
    email: string
    name: string
    createdAt: string
}

interface Invite {
    id: string
    email: string
    role: 'ORG_ADMIN' | 'EMPLOYEE'
    status: string
    createdAt: string
}

interface InviteCredentials {
    email: string
    tempPassword: string
}

export default function OrganizationManagePage() {
    const params = useParams()
    const router = useRouter()
    const orgId = params.id as string
    const { activeOrg, userOrgs, setActiveOrg } = useOrg()

    const [members, setMembers] = useState<Member[]>([])
    const [invites, setInvites] = useState<Invite[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [newRole, setNewRole] = useState<'ORG_ADMIN' | 'EMPLOYEE'>('EMPLOYEE')
    const [adding, setAdding] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')
    const [credentials, setCredentials] = useState<InviteCredentials | null>(null)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const org = userOrgs.find((o) => o.id === orgId)

    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch(`/api/organizations/${orgId}/members`)
            if (res.ok) {
                const data = await res.json()
                setMembers(data)
            } else if (res.status === 403) {
                router.push('/dashboard/organizations')
            }
        } catch (e) {
            console.error('Failed to fetch members:', e)
        }
    }, [orgId, router])

    const fetchInvites = useCallback(async () => {
        try {
            const res = await fetch(`/api/invites?organizationId=${orgId}`)
            if (res.ok) {
                const data = await res.json()
                setInvites(data)
            }
        } catch (e) {
            console.error('Failed to fetch invites:', e)
        }
    }, [orgId])

    useEffect(() => {
        if (org && activeOrg?.id !== orgId) {
            setActiveOrg(org)
        }
        Promise.all([fetchMembers(), fetchInvites()]).finally(() => setLoading(false))
    }, [orgId, org, activeOrg, setActiveOrg, fetchMembers, fetchInvites])

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 2000)
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea')
            textarea.value = text
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 2000)
        }
    }

    const handleInvite = async () => {
        if (!newEmail.trim()) return
        setAdding(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch('/api/auth/invite-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail.trim(),
                    organizationId: orgId,
                    role: newRole,
                    invitedBy: 'admin'
                }),
            })

            if (res.ok) {
                const data = await res.json()
                setInvites([...invites, {
                    id: data.userId,
                    email: data.email,
                    role: data.role,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                }])
                setNewEmail('')
                setNewRole('EMPLOYEE')
                setShowAddForm(false)
                setActiveTab('invites')

                // Show credentials modal
                setCredentials({
                    email: data.email,
                    tempPassword: data.tempPassword,
                })
                setSuccess(`Invitation sent to ${data.email}! Credentials email sent.`)
            } else {
                const err = await res.json()
                setError(err.error || 'Failed to invite user')
            }
        } catch {
            setError('Failed to invite user')
        } finally {
            setAdding(false)
        }
    }

    const handleResendInvite = async (inviteId: string) => {
        try {
            const res = await fetch(`/api/invites/${inviteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteId, action: 'resend' }),
            })
            if (res.ok) {
                const data = await res.json()
                if (data.tempPassword) {
                    setCredentials({
                        email: data.email || '',
                        tempPassword: data.tempPassword,
                    })
                }
                setSuccess('Invite resent! New credentials generated.')
            } else {
                const err = await res.json()
                setError(err.error || 'Failed to resend invite')
            }
        } catch {
            setError('Failed to resend invite')
        }
    }

    const handleCancelInvite = async (inviteId: string) => {
        if (!confirm('Cancel this invitation?')) return
        try {
            const res = await fetch(`/api/invites/${inviteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteId, action: 'cancel' }),
            })
            if (res.ok) {
                setInvites(invites.filter(i => i.id !== inviteId))
            } else {
                const err = await res.json()
                setError(err.error || 'Failed to cancel invite')
            }
        } catch {
            setError('Failed to cancel invite')
        }
    }

    const handleRemove = async (userId: string, name: string) => {
        if (!confirm(`Remove ${name} from this organization?`)) return

        try {
            const res = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                setMembers(members.filter((m) => m.userId !== userId))
            } else {
                const err = await res.json()
                setError(err.error || 'Failed to remove member')
            }
        } catch {
            setError('Failed to remove member')
        }
    }

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Credentials Modal */}
            {credentials && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Invite Credentials</h3>
                            <button onClick={() => setCredentials(null)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            These credentials have been emailed to the user. They will be required to change their password on first sign in.
                        </p>
                        <div className="space-y-3 bg-gray-50 border rounded-lg p-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Email</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                                        {credentials.email}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(credentials.email, 'email')}
                                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                                        title="Copy email"
                                    >
                                        {copiedField === 'email' ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Temporary Password</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono tracking-wider">
                                        {credentials.tempPassword}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(credentials.tempPassword, 'password')}
                                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                                        title="Copy password"
                                    >
                                        {copiedField === 'password' ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-700">
                                <strong>Note:</strong> The user will be forced to change their password when they first sign in.
                            </p>
                        </div>
                        <button
                            onClick={() => setCredentials(null)}
                            className="mt-4 w-full py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            <main className="max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/dashboard/organizations')}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Organizations
                    </button>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-semibold flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-600" />
                                {org?.name || 'Organization'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Manage members and invitations</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" /> Invite Member
                        </button>
                    </div>
                </div>

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex justify-between items-center">
                        <span>{success}</span>
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 ml-2">&times;</button>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
                    </div>
                )}

                {showAddForm && (
                    <div className="bg-white border rounded-lg p-4 mb-4">
                        <h3 className="text-sm font-medium mb-3">Invite New Member</h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="employee@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    autoFocus
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-xs text-gray-500 mb-1">Role</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as 'ORG_ADMIN' | 'EMPLOYEE')}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="ORG_ADMIN">Admin</option>
                                </select>
                            </div>
                            <button
                                onClick={handleInvite}
                                disabled={adding || !newEmail.trim()}
                                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Invite
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setError(''); setNewEmail('') }}
                                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'members'
                                    ? 'border-black text-black'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Members ({members.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('invites')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'invites'
                                    ? 'border-black text-black'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Mail className="w-4 h-4" />
                            Pending Invites ({invites.length})
                        </button>
                    </div>

                    {activeTab === 'members' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Role</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Joined</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {members.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                No members yet. Invite your first team member.
                                            </td>
                                        </tr>
                                    ) : (
                                        members.map((member) => (
                                            <tr key={member.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                                                            <span className="text-xs font-medium">
                                                                {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                                                            </span>
                                                        </div>
                                                        <span className="font-medium">{member.name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{member.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${member.role === 'ORG_ADMIN'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {member.role === 'ORG_ADMIN' && <Crown className="w-3 h-3" />}
                                                        {member.role === 'ORG_ADMIN' ? 'Admin' : 'Employee'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {new Date(member.createdAt).toLocaleDateString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleRemove(member.userId, member.name || member.email)}
                                                        className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                                                        title="Remove member"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'invites' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Role</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Invited</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {invites.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                No pending invitations.
                                            </td>
                                        </tr>
                                    ) : (
                                        invites.map((invite) => (
                                            <tr key={invite.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600">{invite.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${invite.role === 'ORG_ADMIN'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {invite.role === 'ORG_ADMIN' && <Crown className="w-3 h-3" />}
                                                        {invite.role === 'ORG_ADMIN' ? 'Admin' : 'Employee'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                                                        Pending
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {new Date(invite.createdAt).toLocaleDateString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleResendInvite(invite.id)}
                                                            className="p-1 hover:bg-blue-50 text-blue-500 rounded transition-colors"
                                                            title="Resend invite"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelInvite(invite.id)}
                                                            className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                                                            title="Cancel invite"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
