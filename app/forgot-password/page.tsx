'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            if (res.ok) {
                setSent(true)
            } else {
                const data = await res.json()
                setError(data.error || 'Something went wrong')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm p-6 bg-white border rounded-lg">
                {sent ? (
                    <div className="text-center">
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                        <h1 className="text-lg font-semibold mb-1">Check your email</h1>
                        <p className="text-sm text-gray-500 mb-4">
                            If an account exists with <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign in
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to sign in
                            </Link>
                            <h1 className="text-lg font-semibold">Forgot password</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Enter your email and we&apos;ll send you a reset link.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-2.5 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="you@company.com"
                                    required
                                    autoFocus
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
                                        Sending...
                                    </>
                                ) : (
                                    'Send reset link'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
