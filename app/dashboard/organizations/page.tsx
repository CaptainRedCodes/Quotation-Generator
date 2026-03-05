'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrg, UserOrg } from '@/components/OrgContext'
import { Loader2, Plus, Building2, Users, Crown, ChevronRight } from 'lucide-react'

export default function OrganizationsPage() {
    const { userOrgs, refreshOrgs, loading: orgLoading, setActiveOrg, userRole } = useOrg()
    const router = useRouter()
    const [showCreate, setShowCreate] = useState(false)
    const [newOrgName, setNewOrgName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        refreshOrgs()
    }, [refreshOrgs])

    // Employees cannot access this page
    useEffect(() => {
        if (!orgLoading && userOrgs.length > 0) {
            const hasAdminOrg = userOrgs.some(o => o.role === 'ORG_ADMIN')
            if (!hasAdminOrg) {
                router.replace('/dashboard')
            }
        }
    }, [orgLoading, userOrgs, router])

    const handleCreate = async () => {
        if (!newOrgName.trim()) return
        setCreating(true)
        try {
            const res = await fetch('/api/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newOrgName.trim() }),
            })
            if (res.ok) {
                setNewOrgName('')
                setShowCreate(false)
                await refreshOrgs()
            } else {
                const err = await res.json()
                alert(err.error || 'Failed to create organization')
            }
        } catch {
            alert('Failed to create organization')
        } finally {
            setCreating(false)
        }
    }

    const handleOrgClick = (org: UserOrg) => {
        setActiveOrg(org)
        if (org.role === 'ORG_ADMIN') {
            router.push(`/dashboard/organizations/${org.id}`)
        } else {
            router.push('/dashboard')
        }
    }

    if (orgLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-semibold">Organizations</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your organizations or create a new one</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Organization
                    </button>
                </div>

                {/* Create Organization Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                            <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
                            <input
                                type="text"
                                placeholder="Organization name"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                className="w-full px-3 py-2 border rounded-md text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-black"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowCreate(false); setNewOrgName('') }}
                                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !newOrgName.trim()}
                                    className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Organization List */}
                {userOrgs.length === 0 ? (
                    <div className="bg-white border rounded-lg p-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No organizations yet</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Create your first organization to start managing your team and business data.
                        </p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800"
                        >
                            <Plus className="w-4 h-4" /> Create Organization
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {userOrgs.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => handleOrgClick(org)}
                                className="bg-white border rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{org.name}</h3>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.role === 'ORG_ADMIN'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {org.role === 'ORG_ADMIN' ? (
                                                        <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> Admin</span>
                                                    ) : (
                                                        'Employee'
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Users className="w-3 h-3" /> {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
