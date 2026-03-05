'use client'

import Link from 'next/link'
import { FileText, Receipt, Users, Download } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Quotations',
    description: 'Create professional quotations with product components, GST, and custom terms.',
  },
  {
    icon: Receipt,
    title: 'Invoices',
    description: 'Convert quotations to invoices and track payment statuses.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Invite team members and manage organizations with role-based access.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    description: 'Generate professional PDF documents for quotations and invoices.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-lg">ADISEN TECH</span>
          <Link
            href="/login"
            className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">
          Quotation & Invoice Generator
        </h1>
        <p className="text-gray-500 mb-8 max-w-lg mx-auto">
          Create professional quotations, generate invoices, manage products and collaborate with your team — with GST compliance built in.
        </p>
        <Link
          href="/login"
          className="inline-flex px-6 py-3 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
        >
          Get started
        </Link>
      </main>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2025 Adisen Tech Pvt Ltd</p>
        </div>
      </footer>
    </div>
  )
}
