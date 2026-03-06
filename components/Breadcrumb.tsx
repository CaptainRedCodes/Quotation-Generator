'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOrg } from './OrgContext'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  settings: 'Settings',
  quotation: 'Quotations',
  new: 'New',
  invoice: 'Invoices'
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const { orgFetch } = useOrg()
  const segments = pathname.split('/').filter(Boolean)
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    // If a segment looks like a DB ID (CUIDs are 25 chars), try to fetch its name
    segments.forEach((segment, i) => {
      // If the segment is long enough and we haven't fetched it yet
      if (segment.length >= 20 && !dynamicLabels[segment]) {
        // Look at the previous segment to determine the type
        const type = segments[i - 1]
        if (type === 'quotation') {
          orgFetch(`/api/quotations/${segment}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.quotationNo) {
                setDynamicLabels(prev => ({ ...prev, [segment]: data.quotationNo }))
              }
            })
            .catch(() => { })
        } else if (type === 'invoice') {
          orgFetch(`/api/invoices/${segment}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.invoiceNo) {
                setDynamicLabels(prev => ({ ...prev, [segment]: data.invoiceNo }))
              }
            })
            .catch(() => { })
        }
      }
    })
  }, [pathname, segments, orgFetch])

  if (segments.length <= 1 || segments[0] !== 'dashboard') return null

  const breadcrumbs = segments.slice(1).map((segment, index) => {
    const href = '/dashboard/' + segments.slice(1, index + 2).join('/')
    const label = dynamicLabels[segment] || routeLabels[segment] || segment
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
