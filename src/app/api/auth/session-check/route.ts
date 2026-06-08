import { getServerSession } from 'next-auth'
import { apiResponse } from '@/lib/api-utils'

// Re-use the NextAuth handler's config by importing the route
// We need to reconstruct the authOptions here for getServerSession
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { compare } from 'bcryptjs'

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set')
}

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
        const user = await db.user.findUnique({ where: { email: credentials.email.toLowerCase().trim() } })
        if (!user) return null
        const isValid = await compare(credentials.password, user.passwordHash)
        if (!isValid) return null
        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt' as const, maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
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
