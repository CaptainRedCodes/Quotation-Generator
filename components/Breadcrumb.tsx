'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  settings: 'Settings',
  quotation: 'Quotations',
  new: 'New',
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length <= 1 || segments[0] !== 'dashboard') return null

  const breadcrumbs = segments.slice(1).map((segment, index) => {
    const href = '/dashboard/' + segments.slice(1, index + 2).join('/')
    const label = routeLabels[segment] || segment
    return { href, label }
  })

  if (breadcrumbs.length === 0) return null

  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center gap-1 h-9 text-sm">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            </span>
          ))}
        </nav>
      </div>
    </div>
  )
}
