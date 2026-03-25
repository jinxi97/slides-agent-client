import { useEffect, useRef, useState } from 'react'
import { Sparkles, Presentation, Code, Zap } from 'lucide-react'
import {
  signInWithGoogle,
  exchangeGoogleToken,
  createWorkspace,
  waitForWorkspaceReady,
  setStoredAuth,
  type StoredAuth,
} from './auth'

type LandingPageProps = {
  onSignIn: (auth: StoredAuth) => void
}

export default function LandingPage({ onSignIn }: LandingPageProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const [isExchanging, setIsExchanging] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!googleBtnRef.current) return

    signInWithGoogle(googleBtnRef.current)
      .then(async (idToken) => {
        setIsExchanging(true)
        setError(null)
        setStatusMessage('Signing in\u2026')

        try {
          const account = await exchangeGoogleToken(idToken)

          let claimName: string
          let namespace: string

          if (account.workspace) {
            // Returning user — reuse existing workspace
            claimName = account.workspace.claim_name
            namespace = account.workspace.namespace ?? ''
          } else {
            // New user — create a workspace
            setStatusMessage('Creating workspace\u2026')
            const ws = await createWorkspace(account.token)
            claimName = ws.claim_name
            namespace = ws.namespace
          }

          // Wait for the sandbox pod to become ready
          setStatusMessage('Starting workspace\u2026')
          const podName = await waitForWorkspaceReady(claimName, namespace)

          setStoredAuth(account.token, claimName, namespace, podName)
          onSignIn({
            token: account.token,
            claimName,
            namespace,
            podName,
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Sign-in failed')
          setIsExchanging(false)
          setStatusMessage('')
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load Google Sign-In')
      })
  }, [onSignIn])

  return (
    <div className="theme-light flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-[var(--surface-elevated)] p-4">
          <Sparkles className="size-8 text-[var(--text-primary)]" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--hero-title)]">
          Slides Agent
        </h1>
        <p className="mb-8 text-base text-[var(--hero-subtitle)]">
          An AI agent that creates beautiful slides in HTML
        </p>

        {/* Feature list */}
        <div className="mb-10 space-y-3 text-left">
          <Feature
            icon={<Presentation className="size-5" />}
            title="Describe your deck"
            description="Tell the agent what slides you need — it figures out the rest"
          />
          <Feature
            icon={<Code className="size-5" />}
            title="Live HTML preview"
            description="Watch your slides render in real time as the agent builds them"
          />
          <Feature
            icon={<Zap className="size-5" />}
            title="Iterate instantly"
            description="Ask for style changes, new sections, or a complete rework"
          />
        </div>

        {/* Google Sign-In button (rendered by GIS) */}
        <div className="flex flex-col items-center gap-3">
          {isExchanging ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {statusMessage}
            </p>
          ) : (
            <div ref={googleBtnRef} />
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <p className="mt-10 text-xs text-[var(--text-muted)]">
          Sign in to get your own workspace with a persistent AI agent.
        </p>
      </div>
    </div>
  )
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3">
      <span className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  )
}
