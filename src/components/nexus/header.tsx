'use client'

import { Bell, Search } from 'lucide-react'
import type { ViewType } from './sidebar'

const viewNames: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  graph: 'Knowledge Graph',
  agents: 'Agent Control Center',
  search: 'Enterprise Search',
  predictions: 'Predictive Intelligence',
  events: 'Event Stream',
  memory: 'Organizational Memory',
  security: 'Zero Trust Security',
  boardroom: 'AI Boardroom',
  timemachine: 'Enterprise Time Machine',
}

interface HeaderProps {
  currentView: ViewType
}

export function Header({ currentView }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e1e2e] bg-[#0a0a0f] px-6">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">NEXUS ONE</span>
        <span className="text-gray-600">/</span>
        <span className="font-medium text-white">{viewNames[currentView]}</span>
      </div>

      {/* Center: System Status */}
      <div className="hidden items-center gap-6 md:flex">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-gray-400">System Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
          <span className="text-xs text-gray-400">Agents Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-gray-400">Events Streaming</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1.5 rounded-md border border-[#2a2a3e] bg-[#16161f] px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-[#2a2a3e] bg-[#0a0a0f] px-1 py-0.5 text-[10px] text-gray-500 sm:inline">
            ⌘K
          </kbd>
        </button>
        <button className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#16161f] hover:text-gray-200">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  )
}
