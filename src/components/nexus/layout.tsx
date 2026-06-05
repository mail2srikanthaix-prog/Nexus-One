'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar, type ViewType } from './sidebar'
import { Header } from './header'
import { DashboardView } from './dashboard-view'
import { GraphView } from './graph-view'
import { AgentsView } from './agents-view'
import { SearchView } from './search-view'
import { PredictionsView } from './predictions-view'
import { EventsView } from './events-view'
import { MemoryView } from './memory-view'
import { SecurityView } from './security-view'
import { BoardroomView } from './boardroom-view'
import { TimemachineView } from './timemachine-view'
import { ErrorBoundary } from './error-boundary'

const viewComponents: Record<ViewType, React.ComponentType> = {
  dashboard: DashboardView,
  graph: GraphView,
  agents: AgentsView,
  search: SearchView,
  predictions: PredictionsView,
  events: EventsView,
  memory: MemoryView,
  security: SecurityView,
  boardroom: BoardroomView,
  timemachine: TimemachineView,
}

export function NexusLayout() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const ViewComponent = viewComponents[currentView]

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    setMobileSidebarOpen(false)
  }

  const handleSearch = () => {
    setCurrentView('search')
  }

  const handleToggleSidebar = () => {
    setMobileSidebarOpen((prev) => !prev)
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0f]">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentView={currentView}
          onSearch={handleSearch}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              <ErrorBoundary>
                <ViewComponent />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="flex h-7 shrink-0 items-center border-t border-[#1e1e2e] bg-[#0a0a0f] px-4 text-[10px] text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            NEXUS ONE v1.0.0
          </span>
          <span className="mx-3 text-gray-700">|</span>
          <span>Zero Trust Active</span>
          <span className="mx-3 text-gray-700">|</span>
          <span>mTLS Enabled</span>
          <span className="mx-3 text-gray-700">|</span>
          <span>SOC2 Compliant</span>
          <span className="mx-auto" />
          <span className="text-gray-700">&copy; 2025 Nexus Corp</span>
        </footer>
      </div>
    </div>
    </ErrorBoundary>
  )
}
