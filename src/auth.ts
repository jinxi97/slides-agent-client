const AUTH_TOKEN_KEY = 'auth_token'
const CLAIM_NAME_KEY = 'claim_name'
const NAMESPACE_KEY = 'namespace'
const POD_NAME_KEY = 'pod_name'
const API_BASE_URL = __API_BASE_URL__
const GOOGLE_CLIENT_ID = __GOOGLE_CLIENT_ID__

export type StoredAuth = {
  token: string
  claimName: string
  namespace: string
  podName: string
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

export function getStoredAuth(): StoredAuth | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const claimName = localStorage.getItem(CLAIM_NAME_KEY)
  const namespace = localStorage.getItem(NAMESPACE_KEY)
  const podName = localStorage.getItem(POD_NAME_KEY)
  if (token && claimName && namespace && podName) {
    return { token, claimName, namespace, podName }
  }
  return null
}

export function setStoredAuth(
  token: string,
  claimName: string,
  namespace: string,
  podName: string,
) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(CLAIM_NAME_KEY, claimName)
  localStorage.setItem(NAMESPACE_KEY, namespace)
  localStorage.setItem(POD_NAME_KEY, podName)
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(CLAIM_NAME_KEY)
  localStorage.removeItem(NAMESPACE_KEY)
  localStorage.removeItem(POD_NAME_KEY)
}

/* ------------------------------------------------------------------ */
/*  Google Identity Services                                           */
/* ------------------------------------------------------------------ */

/** Wait for the GIS script to finish loading. */
function waitForGis(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.id) {
      resolve()
      return
    }

    const start = Date.now()
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        clearInterval(interval)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Google Identity Services script failed to load'))
      }
    }, 100)
  })
}

/**
 * Initialise GIS and return a Promise that resolves with the Google
 * ID token (JWT credential string) after the user signs in.
 */
export async function signInWithGoogle(
  buttonElement: HTMLElement,
): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured')
  }

  await waitForGis()

  return new Promise((resolve, reject) => {
    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            resolve(response.credential)
          } else {
            reject(new Error('No credential in Google response'))
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      google.accounts.id.renderButton(buttonElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 300,
      })
    } catch (err) {
      reject(err)
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Backend token exchange                                             */
/* ------------------------------------------------------------------ */

export type AccountResponse = {
  user_id: string
  token: string
  workspace: { claim_name: string; template_name: string; namespace?: string } | null
}

export async function exchangeGoogleToken(
  idToken: string,
): Promise<AccountResponse> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/account`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(
      (body as Record<string, string>).detail ?? `Auth failed (${resp.status})`,
    )
  }

  return resp.json()
}

/* ------------------------------------------------------------------ */
/*  Workspace creation                                                 */
/* ------------------------------------------------------------------ */

export type WorkspaceResponse = {
  claim_name: string
  namespace: string
  template_name: string
  status: string
}

export async function createWorkspace(
  token: string,
): Promise<WorkspaceResponse> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/workspaces-with-agent`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(
      (body as Record<string, string>).detail ??
        `Workspace creation failed (${resp.status})`,
    )
  }

  return resp.json()
}

/* ------------------------------------------------------------------ */
/*  Wait for workspace sandbox to become ready (SSE events)            */
/* ------------------------------------------------------------------ */

export function waitForWorkspaceReady(
  claimName: string,
  namespace: string,
): Promise<string> {
  const baseUrl = API_BASE_URL.replace(/\/$/, '')
  const url = `${baseUrl}/workspaces/${encodeURIComponent(claimName)}/events?namespace=${encodeURIComponent(namespace)}`

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(url)

    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>

        if (data.status === 'ready') {
          const sandbox = data.sandbox as
            | Record<string, unknown>
            | undefined
          const podName =
            (sandbox?.pod_name as string) ??
            (sandbox?.sandbox_name as string) ??
            ''
          eventSource.close()
          resolve(podName)
        } else if (data.status === 'failed') {
          eventSource.close()
          reject(
            new Error(
              (data.detail as string) ?? 'Workspace setup failed',
            ),
          )
        }
        // "creating" events are heartbeats — ignore
      } catch {
        // ignore parse errors on individual events
      }
    })

    eventSource.onerror = () => {
      eventSource.close()
      reject(new Error('Lost connection while waiting for workspace'))
    }
  })
}

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID
}
