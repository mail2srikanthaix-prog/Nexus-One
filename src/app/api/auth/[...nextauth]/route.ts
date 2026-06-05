import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import * as bcrypt from 'bcryptjs'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        // Update last login (non-blocking)
        db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {})

        // Log the login (non-blocking)
        db.auditLog.create({
          data: {
            action: 'user.login',
            actor: user.email,
            resource: 'auth',
            severity: 'info',
          },
        }).catch(() => {})

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id: string }).id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'nexus-one-dev-secret-change-in-production',
})

export { handler as GET, handler as POST }
