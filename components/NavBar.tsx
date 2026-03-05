'use client'

import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { LogOut, Settings, ChevronDown, Building2, Users, Check } from 'lucide-react'
import Link from 'next/link'
import { useOrg } from './OrgContext'

export default function NavBar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { activeOrg, userOrgs, userRole, setActiveOrg } = useOrg()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const orgDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Build nav items based on role
  const navItems = []

  if (userRole === 'EMPLOYEE') {
    navItems.push(
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Products', href: '/dashboard/products' },
      { name: 'Settings', href: '/dashboard/settings' },
    )
  }

  if (userRole === 'ORG_ADMIN') {
    navItems.push(
      { name: 'Organizations', href: '/dashboard/organizations' },
      { name: 'Manage Team', href: activeOrg ? `/dashboard/organizations/${activeOrg.id}` : '/dashboard/organizations' },
    )
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg">
            ADISEN TECH
          </Link>

          {/* Organization Switcher — only visible to admins */}
          {userRole === 'ORG_ADMIN' && userOrgs.length > 0 && (
            <div className="relative" ref={orgDropdownRef}>
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="max-w-[150px] truncate">{activeOrg?.name || 'Select Org'}</span>
                {userRole && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${userRole === 'ORG_ADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                    }`}>
                    {userRole === 'ORG_ADMIN' ? 'Admin' : 'Employee'}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {orgDropdownOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white rounded-md shadow-lg border py-1 z-50">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Organizations
                  </div>
                  {userOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setActiveOrg(org)
                        setOrgDropdownOpen(false)
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{org.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${org.role === 'ORG_ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                          }`}>
                          {org.role === 'ORG_ADMIN' ? 'Admin' : 'Employee'}
                        </span>
                      </div>
                      {activeOrg?.id === org.id && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ))}
                  <div className="border-t mt-1 pt-1">
                    <Link
                      href="/dashboard/organizations"
                      onClick={() => setOrgDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Users className="w-4 h-4" />
                      Manage Organizations
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">
                {session?.user?.name ? getInitials(session.user.name) : 'U'}
              </span>
            </div>
            <span className="hidden sm:block text-sm">{session?.user?.name || 'User'}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border py-1 z-50">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
