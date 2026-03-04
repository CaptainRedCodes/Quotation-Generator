'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-200">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Something went wrong!
        </h1>
        
        <p className="text-slate-600 text-center mb-2 text-sm">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
            <p className="text-xs text-red-700 font-mono break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
