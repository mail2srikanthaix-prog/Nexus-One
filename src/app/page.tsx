'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { LandingPage } from '@/components/nexus/landing-page'
import { LoginPage } from '@/components/nexus/login-page'
import { NexusLayout } from '@/components/nexus/layout'

export default function Home() {
  const { appState, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  switch (appState) {
    case 'login':
      return <LoginPage />
    case 'app':
      return <NexusLayout />
    default:
      return <LandingPage />
  }
}
