'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/lib/auth-store'
import { ArrowLeft, Loader2, Shield, AlertCircle, Key, RotateCcw } from 'lucide-react'

type LoginStep = 'credentials' | 'mfa'

export function LoginPage() {
  const setAppState = useAuthStore((s) => s.setAppState)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mfaChecking, setMfaChecking] = useState(false)

  // Refs for TOTP digit inputs
  const totpInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus TOTP input when step changes to MFA
  useEffect(() => {
    if (step === 'mfa') {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        totpInputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [step])

  // ─── Step 1: Check MFA requirement ──────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // First, check if MFA is required for this user
      setMfaChecking(true)
      const checkRes = await fetch('/api/auth/mfa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const checkData = await checkRes.json()
      setMfaChecking(false)

      if (!checkRes.ok) {
        // Credentials are invalid or rate-limited
        setError(checkData.error || 'Invalid email or password')
        return
      }

      if (checkData.mfaRequired) {
        // MFA is required — switch to TOTP step
        setStep('mfa')
        setTotpCode('')
        return
      }

      // No MFA required — proceed with normal signIn
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        await checkAuth()
      } else {
        setError(result?.error || 'Authentication failed. Please try again.')
      }
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Verify TOTP code ───────────────────────────────────────
  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit verification code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totpCode,
        redirect: false,
      })

      if (result?.ok) {
        await checkAuth()
      } else {
        setError('Invalid verification code. Please try again.')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Back to credentials step ───────────────────────────────────────
  const handleBack = () => {
    setStep('credentials')
    setTotpCode('')
    setError(null)
  }

  // ─── TOTP input change handler ──────────────────────────────────────
  const handleTotpChange = useCallback((value: string) => {
    // Only allow digits, max 6
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setTotpCode(digits)
    // Clear error when typing
    if (digits.length > 0) setError(null)
  }, [])

  // ─── Handle TOTP paste ──────────────────────────────────────────────
  const handleTotpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setTotpCode(pasted)
  }, [])

  // ─── Auto-submit when 6 digits are entered ──────────────────────────
  useEffect(() => {
    if (step === 'mfa' && totpCode.length === 6 && !loading) {
      // Auto-submit the form
      const form = document.getElementById('mfa-form') as HTMLFormElement
      if (form) {
        form.requestSubmit()
      }
    }
  }, [totpCode, step, loading])

  // ─── Fill demo credentials ──────────────────────────────────────────
  const fillDemo = () => {
    setEmail('admin@nexuscorp.io')
    setPassword('nexus123')
    setError(null)
  }

  // ─── Individual digit box renderer ──────────────────────────────────
  const renderDigitBoxes = () => {
    const digits = totpCode.split('')
    const boxes = []

    for (let i = 0; i < 6; i++) {
      const digit = digits[i] || ''
      const isFilled = digit !== ''
      const isCurrent = i === totpCode.length

      boxes.push(
        <div
          key={i}
          className={`flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-semibold transition-all duration-150 sm:h-14 sm:w-14 sm:text-xl ${
            isCurrent
              ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : isFilled
                ? 'border-[#2a2a3e] bg-[#0a0a0f] text-white'
                : 'border-[#1e1e2e] bg-[#050508] text-gray-600'
          }`}
        >
          {digit || (isCurrent ? (
            <span className="h-5 w-0.5 animate-pulse bg-emerald-400" />
          ) : (
            <span className="text-gray-700">·</span>
          ))}
        </div>
      )
    }

    return boxes
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
          onClick={() => {
            if (step === 'mfa') {
              handleBack()
            } else {
              setAppState('landing')
            }
          }}
          className="mb-8 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 'mfa' ? 'Back to Login' : 'Back to Home'}
        </button>

        {/* Card */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f] p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* ─── Step 1: Credentials ──────────────────────────────────── */}
            {step === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
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
                        {mfaChecking ? 'Checking...' : 'Authenticating...'}
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
              </motion.div>
            )}

            {/* ─── Step 2: MFA / TOTP Verification ──────────────────────── */}
            {step === 'mfa' && (
              <motion.div
                key="mfa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                {/* MFA Icon */}
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
                    <Key className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">Two-Factor Auth</h1>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the 6-digit code from your authenticator app
                  </p>
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

                {/* MFA Form */}
                <form id="mfa-form" onSubmit={handleMfaVerify} className="space-y-6">
                  {/* Digit boxes (visual) */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {renderDigitBoxes()}
                  </div>

                  {/* Hidden input for actual value entry */}
                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => handleTotpChange(e.target.value)}
                    onPaste={handleTotpPaste}
                    className="sr-only"
                    aria-label="6-digit verification code"
                    maxLength={6}
                  />

                  {/* Clickable area to focus hidden input */}
                  <div
                    className="cursor-pointer text-center text-xs text-gray-600 hover:text-gray-400"
                    onClick={() => totpInputRef.current?.focus()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') totpInputRef.current?.focus()
                    }}
                  >
                    {totpCode.length < 6
                      ? `Tap to enter code · ${totpCode.length}/6 digits`
                      : 'Verifying...'}
                  </div>

                  {/* Verify button */}
                  <button
                    type="submit"
                    disabled={loading || totpCode.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 hover:shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Verify Code
                      </>
                    )}
                  </button>
                </form>

                {/* Helper links */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                    <button
                      onClick={() => {
                        setTotpCode('')
                        setError(null)
                        totpInputRef.current?.focus()
                      }}
                      className="flex items-center gap-1.5 transition-colors hover:text-gray-400"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Re-enter code
                    </button>
                  </div>

                  <div className="rounded-lg border border-[#1e1e2e] bg-[#050508] p-3">
                    <p className="text-center text-[10px] text-gray-600">
                      Use the backup code option if you&apos;ve lost access to your authenticator app.
                      Contact your administrator for assistance.
                    </p>
                  </div>
                </div>

                {/* Logged-in-as hint */}
                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[#1e1e2e]/50 bg-[#050508]/50 px-3 py-2">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  <span className="text-[11px] text-gray-500">
                    Signing in as <span className="text-gray-400">{email}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
