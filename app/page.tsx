'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-lg">ADISEN TECH</span>
          <Link
            href="/login"
            className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-4">
          Quotation Generator
        </h1>
        <p className="text-gray-600 mb-8">
          Professional quotation and invoice management for Adisen Tech
        </p>

        <Link
          href="/login"
          className="inline-flex px-6 py-3 bg-black text-white text-sm rounded-md hover:bg-gray-800"
        >
          Get started
        </Link>
      </main>
    </div>
  )
}
