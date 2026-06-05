'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[NEXUS ONE ErrorBoundary] Caught render error:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#0a0a0f] p-6">
          <div className="max-w-md rounded-lg border border-[#1e1e2e] bg-[#0d0d14] p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="mb-1 text-lg font-semibold text-white">
              Something went wrong
            </h2>
            <p className="mb-1 text-xs tracking-widest text-emerald-400/70">
              NEXUS ONE
            </p>
            <p className="mb-6 text-sm text-gray-400">
              An unexpected error occurred while rendering this view. The rest of the application is still running.
            </p>
            {this.state.error && (
              <pre className="mb-6 max-h-32 overflow-auto rounded border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-left text-xs text-red-300/80">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={this.handleReload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Reload
              </Button>
              <Button
                variant="outline"
                className="border-[#1e1e2e] text-gray-400 hover:bg-[#1e1e2e] hover:text-white"
              >
                Report Issue
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
