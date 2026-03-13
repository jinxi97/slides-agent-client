/// <reference types="vite/client" />

declare const __API_BASE_URL__: string
declare const __GOOGLE_CLIENT_ID__: string

/* Google Identity Services (loaded via script tag in index.html) */
declare namespace google.accounts.id {
  interface CredentialResponse {
    credential: string
    select_by: string
    clientId?: string
  }

  interface GsiButtonConfiguration {
    type?: 'standard' | 'icon'
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    width?: number
    locale?: string
  }

  function initialize(config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }): void

  function renderButton(
    parent: HTMLElement,
    options: GsiButtonConfiguration,
  ): void

  function prompt(): void
  function disableAutoSelect(): void
}
