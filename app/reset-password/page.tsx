'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [token, setToken] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [tokenError, setTokenError] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')
        const urlEmail = params.get('email')

        if (urlToken) {
            setToken(urlToken)
            setEmail(urlEmail || '')
        } else {
            setTokenError(true)
        }
    }, [])

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
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, newPassword: password }),
            })

            if (res.ok) {
                setSuccess(true)
                setTimeout(() => router.push('/login'), 3000)
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to reset password')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    if (tokenError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-full max-w-sm p-6 bg-white border rounded-lg text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h1 className="text-lg font-semibold mb-1">Invalid or expired link</h1>
                    <p className="text-sm text-gray-500 mb-4">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="inline-flex px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                    >
                        Request new link
                    </Link>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-full max-w-sm p-6 bg-white border rounded-lg text-center">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                    <h1 className="text-lg font-semibold mb-1">Password updated</h1>
                    <p className="text-sm text-gray-500 mb-4">
                        Your password has been reset successfully. Redirecting to sign in...
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to sign in
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm p-6 bg-white border rounded-lg">
                <div className="mb-6">
                    <h1 className="text-lg font-semibold">Set new password</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Enter your new password below.
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
                            'Update password'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
