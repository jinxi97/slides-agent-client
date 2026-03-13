const AUTH_TOKEN_KEY = 'auth_token'
const WORKSPACE_ID_KEY = 'workspace_id'
const API_BASE_URL = __API_BASE_URL__
const GOOGLE_CLIENT_ID = __GOOGLE_CLIENT_ID__

export type StoredAuth = {
  token: string
  workspaceId: string
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

export function getStoredAuth(): StoredAuth | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const workspaceId = localStorage.getItem(WORKSPACE_ID_KEY)
  if (token && workspaceId) {
    return { token, workspaceId }
  }
  return null
}

export function setStoredAuth(token: string, workspaceId: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(WORKSPACE_ID_KEY, workspaceId)
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(WORKSPACE_ID_KEY)
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

export async function exchangeGoogleToken(
  idToken: string,
): Promise<{ workspace_id: string; token: string }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/auth/google`

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

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID
}
