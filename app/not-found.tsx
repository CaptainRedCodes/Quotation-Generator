import { FileQuestion } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-200">
        <div className="flex justify-center mb-4">
          <FileQuestion className="w-12 h-12 text-amber-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-center text-slate-800 mb-2">
          404
        </h1>
        
        <p className="text-lg font-semibold text-center text-slate-700 mb-2">
          Page not found
        </p>

        <p className="text-slate-600 text-center mb-6 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors text-center font-medium"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors text-center font-medium"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
