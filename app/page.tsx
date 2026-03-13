'use client'

import Link from 'next/link'
import { FileText, Receipt, Users, Download, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen bg-white selection:bg-gray-200 flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold text-xl tracking-tight">Ledgr</span>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors hover:shadow-md"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative overflow-hidden pt-20 pb-24 sm:pt-32 sm:pb-32 flex-1">
        {/* Soft background gradient blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-gray-200 to-gray-100 rounded-full blur-[100px] -z-10 opacity-30"></div>

        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          {/* Hero text */}
          <div className="text-center lg:text-left lg:max-w-2xl lg:w-1/2 z-10 w-full">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight animate-fade-in-up">
              Quotation & Invoice Generator
            </h1>
            <p className="text-lg text-gray-500 mb-10 mx-auto lg:mx-0 max-w-xl animate-fade-in-up delay-150">
              Create professional quotations, generate invoices, manage products and collaborate with your team — with GST compliance built in.
            </p>
            <div className="animate-fade-in-up delay-300">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Floating mockups (right side) */}
          <div className="w-full lg:w-1/2 relative lg:h-[400px] hidden sm:flex items-center justify-center animate-fade-in-up delay-300">
            <div className="relative w-full max-w-[500px] aspect-[4/3] mx-auto">
              {/* Back card */}
              <div className="absolute top-4 left-4 w-full h-full bg-white rounded-xl shadow-xl border border-gray-100 rotate-3 transform transition-transform hover:rotate-6">
                <div className="p-6 h-full flex flex-col gap-4 opacity-50">
                  <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                  <div className="w-full h-px bg-gray-100"></div>
                  <div className="flex gap-4">
                    <div className="w-1/2 h-24 bg-gray-50 rounded border border-gray-100"></div>
                    <div className="w-1/2 h-24 bg-gray-50 rounded border border-gray-100"></div>
                  </div>
                  <div className="w-full flex-1 bg-gray-50 rounded border border-gray-100"></div>
                </div>
              </div>

              {/* Front card */}
              <div className="absolute top-0 left-0 w-full h-full bg-white rounded-xl shadow-2xl border border-gray-200 -rotate-2 transform transition-transform hover:rotate-0 flex flex-col overflow-hidden">
                <div className="h-2 bg-black w-full"></div>
                <div className="p-6 flex-1 flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="w-20 h-5 bg-gray-900 rounded-sm"></div>
                      <div className="w-32 h-3 bg-gray-200 rounded-sm"></div>
                    </div>
                    <div className="text-right space-y-2 flex flex-col items-end">
                      <div className="w-24 h-6 bg-gray-100 rounded-md"></div>
                      <div className="w-16 h-3 bg-gray-200 rounded-sm"></div>
                    </div>
                  </div>
                  <div className="w-full h-px bg-gray-100 my-2"></div>

                  {/* Table mockup */}
                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center text-gray-400 pb-2 border-b border-gray-50">
                      <div className="w-1/2 h-3 bg-gray-100 rounded-sm"></div>
                      <div className="w-16 h-3 bg-gray-100 rounded-sm"></div>
                      <div className="w-16 h-3 bg-gray-100 rounded-sm"></div>
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="w-1/2 h-4 bg-gray-200 rounded-sm"></div>
                        <div className="w-12 h-3 bg-gray-100 rounded-sm"></div>
                        <div className="w-16 h-4 bg-gray-200 rounded-sm text-right"></div>
                      </div>
                    ))}
                  </div>

                  {/* Totals mockup */}
                  <div className="w-full border-t border-gray-100 pt-4 flex flex-col items-end gap-2">
                    <div className="flex justify-between w-48">
                      <div className="w-16 h-3 bg-gray-100 rounded"></div>
                      <div className="w-20 h-3 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex justify-between w-48">
                      <div className="w-16 h-3 bg-gray-100 rounded"></div>
                      <div className="w-20 h-3 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex justify-between w-48 pt-2 border-t border-gray-100">
                      <div className="w-16 h-4 bg-gray-300 rounded"></div>
                      <div className="w-24 h-5 bg-gray-900 rounded"></div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Thin decorative divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-24 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Everything you need</h2>
          <p className="mt-4 text-gray-500">Powerful features to streamline your billing process.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-md transition-shadow duration-300 relative group overflow-hidden"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="relative w-12 h-12 mb-6">
                {/* Colored icon background circle */}
                <div className="absolute inset-0 bg-gray-900/10 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500 ease-out origin-center"></div>
                <div className="absolute inset-0 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                  <feature.icon className="w-6 h-6 text-gray-700 relative z-10" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section before footer */}
      <section className="w-full bg-gray-900/5 py-24 border-t border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 tracking-tight">
            Ready to create your first quotation?
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Get started right now and experience a seamless billing process.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-white pt-12 pb-8">
        {/* Subtle top border gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <span className="font-semibold text-gray-400">Ledgr</span>
          </div>

          <div className="flex gap-6 mb-4 md:mb-0">
            <Link href="#" className="text-sm text-gray-500 relative group overflow-hidden pointer-events-none">
              <span className="relative z-10 group-hover:text-gray-900 transition-colors">Privacy Policy</span>
              <span className="absolute bottom-0 left-0 w-full h-px bg-gray-900 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
            </Link>
            <Link href="#" className="text-sm text-gray-500 relative group overflow-hidden pointer-events-none">
              <span className="relative z-10 group-hover:text-gray-900 transition-colors">Terms of Service</span>
              <span className="absolute bottom-0 left-0 w-full h-px bg-gray-900 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
            </Link>
          </div>

          <p className="text-sm text-gray-400">© 2026 Ledgr Services Pvt Ltd</p>
        </div>
      </footer>
    </div>
  )
}
