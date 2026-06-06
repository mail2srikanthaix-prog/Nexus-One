import { getServerSession } from 'next-auth'
import { apiResponse } from '@/lib/api-utils'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null
        const isValid = await compare(credentials.password, user.passwordHash)
        if (!isValid) return null
        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt' as const, maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET || 'nexus-one-dev-secret-change-in-production',
}

export async function GET() {
  const session = await getServerSession(authOptions)
  return apiResponse({
    authenticated: !!session,
    user: session?.user ? {
      name: session.user.name,
      email: session.user.email,
      role: (session.user as { role: string }).role,
    } : null,
  })
}
