'use client'

import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/auth-store'
import {
  Shield,
  Building2,
  Brain,
  RefreshCcw,
  Database,
  Search,
  TrendingUp,
  Heart,
  Eye,
  Radio,
  ArrowRight,
  ChevronRight,
  Lock,
  CheckCircle2,
} from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Zero Trust Architecture',
    description: 'Every request verified, no implicit trust. Continuous authentication at every layer.',
    color: 'emerald',
  },
  {
    icon: Building2,
    title: 'Company Digital Twin',
    description: 'Real-time mirror of your entire organization — people, processes, and systems.',
    color: 'cyan',
  },
  {
    icon: Brain,
    title: 'Multi-Agent OS',
    description: '10 specialized AI agents working in concert for autonomous enterprise management.',
    color: 'emerald',
  },
  {
    icon: RefreshCcw,
    title: 'Closed-Loop Learning',
    description: 'Decisions feed back into organizational memory for continuous improvement.',
    color: 'cyan',
  },
  {
    icon: Database,
    title: 'Autonomous Company Memory',
    description: 'Never lose institutional knowledge. Every decision, context, and outcome preserved.',
    color: 'emerald',
  },
  {
    icon: Search,
    title: 'Enterprise Search 3.0',
    description: 'Semantic search across all data silos with AI-powered relevance ranking.',
    color: 'cyan',
  },
  {
    icon: TrendingUp,
    title: 'Predictive Intelligence',
    description: 'See risks before they become incidents. Anticipate market shifts and resource needs.',
    color: 'emerald',
  },
  {
    icon: Heart,
    title: 'Self-Healing Organization',
    description: 'Auto-remediation for known failure patterns. Resolve issues before humans notice.',
    color: 'cyan',
  },
  {
    icon: Eye,
    title: 'Explainable AI',
    description: 'Every AI decision has a clear reasoning chain. Full auditability and compliance.',
    color: 'emerald',
  },
  {
    icon: Radio,
    title: 'Real-Time Event Fabric',
    description: '12+ connectors streaming live data from every corner of your enterprise.',
    color: 'cyan',
  },
]

const stats = [
  { value: '10', label: 'AI Agents' },
  { value: '12+', label: 'Connectors' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<50ms', label: 'Response' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

export function LandingPage() {
  const setAppState = useAuthStore((s) => s.setAppState)

  return (
    <div className="min-h-screen flex flex-col bg-[#050508]">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
        {/* Animated grid background */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute left-1/3 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
        </div>

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-emerald-400/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative z-10 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Enterprise-Grade Intelligence Platform
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl md:text-8xl"
          >
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              NEXUS ONE
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-4 text-lg font-medium text-gray-300 sm:text-xl md:text-2xl"
          >
            Autonomous Enterprise Intelligence Operating System
          </motion.p>

          {/* Tagline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-10 text-sm text-gray-500 sm:text-base"
          >
            10 AI Agents. One Mission. Zero Blind Spots.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <button
              onClick={() => setAppState('login')}
              className="group flex items-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              Launch Console
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-8 py-3.5 text-sm font-semibold text-gray-300 transition-all hover:border-emerald-500/30 hover:bg-[#0f0f18] hover:text-white active:scale-[0.98]">
              Watch Demo
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            <div className="h-8 w-5 rounded-full border border-gray-700 p-1">
              <motion.div
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative bg-[#0a0a0f] px-4 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-emerald-500/3 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-cyan-500/3 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-emerald-400"
            >
              Core Capabilities
            </motion.span>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl"
            >
              Built for the{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Autonomous Enterprise
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto max-w-2xl text-gray-500"
            >
              Ten foundational principles power the world&apos;s first truly autonomous
              enterprise intelligence operating system.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="group relative rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] p-5 transition-all hover:border-emerald-500/20 hover:bg-[#0d0d14]"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                    feature.color === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-cyan-500/10 text-cyan-400'
                  }`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{feature.description}</p>
                {/* Hover glow */}
                <div
                  className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100 ${
                    feature.color === 'emerald'
                      ? 'shadow-[inset_0_0_30px_rgba(16,185,129,0.03)]'
                      : 'shadow-[inset_0_0_30px_rgba(6,182,212,0.03)]'
                  }`}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative bg-[#050508] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="mb-2 text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-[#0a0a0f] px-4 py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>

        <motion.div
          className="relative mx-auto max-w-3xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-4 text-3xl font-bold text-white sm:text-4xl"
          >
            Ready to Activate Your{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Enterprise Intelligence
            </span>
            ?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 text-gray-500"
          >
            Join the next generation of autonomous enterprise management. Zero configuration
            required. Full intelligence from day one.
          </motion.p>
          <motion.div variants={fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
            <button
              onClick={() => setAppState('login')}
              className="group inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              Access Console
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e1e2e] bg-[#050508] px-4 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-xs text-gray-600">&copy; 2025 Nexus Corp</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3 w-3 text-emerald-500" />
              Zero Trust Active
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              SOC2 Compliant
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
