'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import NavBar from '@/components/NavBar'
import Breadcrumb from '@/components/Breadcrumb'
import { OrgProvider } from '@/components/OrgContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  if (status !== 'authenticated') return null

  return (
    <OrgProvider>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <Breadcrumb />
        {children}
      </div>
    </OrgProvider>
  )
}
