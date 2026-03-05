'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export type OrgRole = 'ORG_ADMIN' | 'EMPLOYEE'

export interface UserOrg {
    id: string
    name: string
    role: OrgRole
    memberCount: number
    createdAt: string
}

interface OrgContextType {
    activeOrg: UserOrg | null
    userOrgs: UserOrg[]
    userRole: OrgRole | null
    loading: boolean
    setActiveOrg: (org: UserOrg) => void
    refreshOrgs: () => Promise<void>
    orgFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const OrgContext = createContext<OrgContextType>({
    activeOrg: null,
    userOrgs: [],
    userRole: null,
    loading: true,
    setActiveOrg: () => { },
    refreshOrgs: async () => { },
    orgFetch: async () => new Response(),
})

export function useOrg() {
    return useContext(OrgContext)
}

const ACTIVE_ORG_KEY = 'active-org-id'

export function OrgProvider({ children }: { children: ReactNode }) {
    const { status } = useSession()
    const [userOrgs, setUserOrgs] = useState<UserOrg[]>([])
    const [activeOrg, setActiveOrgState] = useState<UserOrg | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchOrgs = useCallback(async () => {
        try {
            const res = await fetch('/api/organizations')
            if (res.ok) {
                const orgs: UserOrg[] = await res.json()
                setUserOrgs(orgs)
                return orgs
            }
        } catch (e) {
            console.error('Failed to fetch organizations:', e)
        }
        return []
    }, [])

    const refreshOrgs = useCallback(async () => {
        const orgs = await fetchOrgs()
        // If active org was removed, clear it
        if (activeOrg && !orgs.find((o) => o.id === activeOrg.id)) {
            if (orgs.length > 0) {
                setActiveOrgState(orgs[0])
                localStorage.setItem(ACTIVE_ORG_KEY, orgs[0].id)
            } else {
                setActiveOrgState(null)
                localStorage.removeItem(ACTIVE_ORG_KEY)
            }
        }
    }, [activeOrg, fetchOrgs])

    useEffect(() => {
        if (status !== 'authenticated') {
            if (status === 'unauthenticated') setLoading(false)
            return
        }

        (async () => {
            const orgs = await fetchOrgs()
            const savedOrgId = localStorage.getItem(ACTIVE_ORG_KEY)
            const saved = orgs.find((o) => o.id === savedOrgId)

            if (saved) {
                setActiveOrgState(saved)
            } else if (orgs.length > 0) {
                setActiveOrgState(orgs[0])
                localStorage.setItem(ACTIVE_ORG_KEY, orgs[0].id)
            }
            setLoading(false)
        })()
    }, [status, fetchOrgs])

    const setActiveOrg = useCallback((org: UserOrg) => {
        setActiveOrgState(org)
        localStorage.setItem(ACTIVE_ORG_KEY, org.id)
    }, [])

    /**
     * Wrapper around fetch that automatically adds the x-organization-id header.
     */
    const orgFetch = useCallback(
        async (url: string, options?: RequestInit): Promise<Response> => {
            const headers = new Headers(options?.headers)
            if (activeOrg) {
                headers.set('x-organization-id', activeOrg.id)
            }
            return fetch(url, { ...options, headers })
        },
        [activeOrg]
    )

    return (
        <OrgContext.Provider
            value={{
                activeOrg,
                userOrgs,
                userRole: activeOrg?.role ?? null,
                loading,
                setActiveOrg,
                refreshOrgs,
                orgFetch,
            }}
        >
            {children}
        </OrgContext.Provider>
    )
}
