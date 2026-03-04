import NextAuth, { DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
  
  interface User {
    role: string
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Auth: Missing email or password')
          return null
        }

        try {
          // Call Supabase Auth API to verify credentials
          const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Supabase auth failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData.error,
              message: errorData.error_description || errorData.message
            })
            console.error('Debug - Supabase URL:', supabaseUrl)
            console.error('Debug - API Key present:', !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
            console.error('Debug - Email:', credentials.email)
            return null
          }

          const data = await response.json()
          
          if (data.user) {
            console.log('Auth: Successful login for', credentials.email)
            return {
              id: data.user.id,
              name: data.user.user_metadata?.name || data.user.email,
              email: data.user.email,
              role: data.user.user_metadata?.role || 'user'
            }
          }

          console.error('Auth: No user in response')
          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60
  }
})
