'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOrg } from '@/components/OrgContext'
import { Loader2, UserPlus, Trash2, Crown, ArrowLeft, Users, Shield } from 'lucide-react'

interface Member {
    id: string
    userId: string
    role: 'ORG_ADMIN' | 'EMPLOYEE'
    email: string
    name: string
    createdAt: string
}

export default function OrganizationManagePage() {
    const params = useParams()
    const router = useRouter()
    const orgId = params.id as string
    const { activeOrg, userOrgs, setActiveOrg } = useOrg()

    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [newRole, setNewRole] = useState<'ORG_ADMIN' | 'EMPLOYEE'>('EMPLOYEE')
    const [adding, setAdding] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Find the org from the user's list
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
        } finally {
            setLoading(false)
        }
    }, [orgId, router])

    useEffect(() => {
        // Set this as the active org
        if (org && activeOrg?.id !== orgId) {
            setActiveOrg(org)
        }
        fetchMembers()
    }, [orgId, org, activeOrg, setActiveOrg, fetchMembers])

    const handleAddMember = async () => {
        if (!newEmail.trim()) return
        setAdding(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch(`/api/organizations/${orgId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
            })

            if (res.ok) {
                const member = await res.json()
                setMembers([...members, member])
                setNewEmail('')
                setNewRole('EMPLOYEE')
                setShowAddForm(false)
                if (member.invited) {
                    setSuccess(`Invite email sent to ${member.email}! They can set their password and log in.`)
                } else {
                    setSuccess(`${member.name || member.email} added to the organization.`)
                }
            } else {
                const err = await res.json()
                setError(err.error || 'Failed to add member')
            }
        } catch {
            setError('Failed to add member')
        } finally {
            setAdding(false)
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
                alert(err.error || 'Failed to remove member')
            }
        } catch {
            alert('Failed to remove member')
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
            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
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
                            <p className="text-sm text-gray-500 mt-1">Manage members of this organization</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" /> Add Member
                        </button>
                    </div>
                </div>

                {/* Success Banner */}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex justify-between items-center">
                        <span>{success}</span>
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 ml-2">&times;</button>
                    </div>
                )}

                {/* Add Member Form */}
                {showAddForm && (
                    <div className="bg-white border rounded-lg p-4 mb-4">
                        <h3 className="text-sm font-medium mb-3">Add New Member</h3>
                        {error && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="employee@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
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
                                onClick={handleAddMember}
                                disabled={adding || !newEmail.trim()}
                                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Add
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

                {/* Members Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                            Members ({members.length})
                        </span>
                    </div>
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
                                            No members yet. Add your first team member above.
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
                </div>
            </main>
        </div>
    )
}
