'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Search, Menu, LogOut, User, ChevronDown } from 'lucide-react'
import type { ViewType } from './sidebar'
import { useAuthStore } from '@/lib/auth-store'

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
  connectors: 'Connector Framework',
}

interface HeaderProps {
  currentView: ViewType
  onSearch?: () => void
  onToggleSidebar?: () => void
}

export function Header({ currentView, onSearch, onToggleSidebar }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  // Keyboard shortcut: Cmd+K / Ctrl+K to navigate to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onSearch?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearch])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'A'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e1e2e] bg-[#0a0a0f] px-6">
      {/* Left: Sidebar Toggle (mobile) + Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {onToggleSidebar && (
          <button
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-[#16161f] hover:text-gray-200 md:hidden"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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
        <button
          className="flex items-center gap-1.5 rounded-md border border-[#2a2a3e] bg-[#16161f] px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200"
          onClick={() => onSearch?.()}
          aria-label="Open search (Cmd+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-[#2a2a3e] bg-[#0a0a0f] px-1 py-0.5 text-[10px] text-gray-500 sm:inline">
            ⌘K
          </kbd>
        </button>
        <button
          className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#16161f] hover:text-gray-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-[#16161f]"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="User profile menu"
            aria-expanded={dropdownOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
              {userInitial}
            </div>
            <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] shadow-2xl">
              {/* User info */}
              <div className="border-b border-[#1e1e2e] px-4 py-3">
                <p className="text-sm font-medium text-white">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'admin@nexuscorp.io'}</p>
                <span className="mt-1.5 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {user?.role || 'Super Admin'}
                </span>
              </div>

              {/* Menu items */}
              <div className="p-1.5">
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-[#16161f] hover:text-white"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
