'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Loader2, Lock, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
        router.push('/login')
        return null
    }

    // If authenticated but doesn't need password change, redirect to dashboard
    if (status === 'authenticated' && !session?.user?.mustChangePassword) {
        router.push('/dashboard')
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password }),
            })

            if (res.ok) {
                setSuccess(true)
                // Sign out and redirect to login so they can sign in with new password
                setTimeout(async () => {
                    await signOut({ redirect: false })
                    router.push('/login')
                }, 2000)
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to change password')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-full max-w-sm p-6 bg-white border rounded-lg text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-green-600" />
                    </div>
                    <h1 className="text-lg font-semibold mb-1">Password updated!</h1>
                    <p className="text-sm text-gray-500">
                        Redirecting to sign in with your new password...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm p-6 bg-white border rounded-lg">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h1 className="text-lg font-semibold">Change your password</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        You must set a new password before continuing. This is required for your security.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="At least 6 characters"
                            minLength={6}
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Re-enter your password"
                            minLength={6}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Set new password'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
