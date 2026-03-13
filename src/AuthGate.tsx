import { useState } from 'react'
import { getStoredAuth, clearStoredAuth, type StoredAuth } from './auth'
import App from './App'
import LandingPage from './LandingPage'

export default function AuthGate() {
  const [auth, setAuth] = useState<StoredAuth | null>(getStoredAuth)

  function handleSignIn(newAuth: StoredAuth) {
    setAuth(newAuth)
  }

  function handleSignOut() {
    clearStoredAuth()
    setAuth(null)
  }

  if (!auth) {
    return <LandingPage onSignIn={handleSignIn} />
  }

  return <App onSignOut={handleSignOut} />
}
