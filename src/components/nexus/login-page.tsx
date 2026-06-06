'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/auth-store'
import { ArrowLeft, Loader2, Shield, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const setAppState = useAuthStore((s) => s.setAppState)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        await checkAuth()
      } else {
        setError(result?.error || 'Invalid email or password')
      }
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('admin@nexuscorp.io')
    setPassword('nexus123')
    setError(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050508] px-4">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Back button */}
        <button
          onClick={() => setAppState('landing')}
          className="mb-8 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Card */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f] p-8 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">NEXUS ONE</h1>
            <p className="mt-1 text-xs text-gray-500">Enterprise Intelligence Operating System</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-gray-400">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#050508] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-gray-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#050508] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-lg border border-[#1e1e2e] bg-[#050508] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Demo Credentials</span>
              <button
                onClick={fillDemo}
                className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Auto-Fill
              </button>
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              <p>
                <span className="text-gray-400">Email:</span> admin@nexuscorp.io
              </p>
              <p>
                <span className="text-gray-400">Password:</span> nexus123
              </p>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-600">
          <Shield className="h-3 w-3 text-emerald-600" />
          <span>Secured with Zero Trust Authentication</span>
        </div>
      </motion.div>
    </div>
  )
}
