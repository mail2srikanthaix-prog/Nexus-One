'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Network,
  Bot,
  Search,
  TrendingUp,
  Activity,
  Brain,
  Shield,
  Users,
  Clock,
  Settings,
  ChevronRight,
} from 'lucide-react'
import Image from 'next/image'

export type ViewType =
  | 'dashboard'
  | 'graph'
  | 'agents'
  | 'search'
  | 'predictions'
  | 'events'
  | 'memory'
  | 'security'
  | 'boardroom'
  | 'timemachine'

interface NavItem {
  id: ViewType
  icon: React.ElementType
  label: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'graph', icon: Network, label: 'Knowledge Graph' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'predictions', icon: TrendingUp, label: 'Predictions' },
  { id: 'events', icon: Activity, label: 'Events' },
  { id: 'memory', icon: Brain, label: 'Memory' },
  { id: 'security', icon: Shield, label: 'Security' },
  { id: 'boardroom', icon: Users, label: 'AI Boardroom' },
  { id: 'timemachine', icon: Clock, label: 'Time Machine' },
]

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.aside
      className="relative z-50 flex h-screen flex-col border-r border-[#1e1e2e] bg-[#0a0a0f]"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      animate={{ width: isExpanded ? 240 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center border-b border-[#1e1e2e] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <Image src="/nexus-logo.png" alt="NEXUS ONE" width={32} height={32} className="rounded-lg" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="text-sm font-bold tracking-tight text-white">
                  NEXUS ONE
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-gray-400 hover:bg-[#16161f] hover:text-gray-200'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                  />
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap text-sm font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && isExpanded && (
                    <ChevronRight className="ml-auto h-4 w-4 text-emerald-400" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom settings */}
      <div className="border-t border-[#1e1e2e] p-2">
        <button aria-label="Settings" title="Settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-gray-400 transition-colors hover:bg-[#16161f] hover:text-gray-200">
          <Settings className="h-5 w-5 shrink-0 text-gray-500" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap text-sm font-medium"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
