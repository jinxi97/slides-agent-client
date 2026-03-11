import { useState } from 'react'
import {
  ArrowUp,
  Bot,
  Download,
  ExternalLink,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Paperclip,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
} from 'lucide-react'
import { Button } from './components/ui/button'
import { Switch } from './components/ui/switch'

type ThemeMode = 'dark' | 'light'

type ChatGroup = {
  label: string
  items: string[]
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const chatGroups: ChatGroup[] = [
  {
    label: 'Today',
    items: [
      'Landing page redesign',
      'Portfolio with animations',
      'Dashboard UI prototype',
    ],
  },
  {
    label: 'Yesterday',
    items: ['Blog post template', 'E-commerce product page'],
  },
]

const navItems = ['Features', 'Reviews', 'Pricing', 'About']
const quickActions = ['Help me create a pitch deck', 'Change to neon style']

const messages: Message[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Create a landing page hero section, navbar, and CTA buttons.',
  },
  {
    id: 'm2',
    role: 'user',
    text: 'For a startup landing page with a modern, neutral aesthetic and strong product focus.',
  },
  {
    id: 'm3',
    role: 'assistant',
    text: 'I can build a clean hero with refined typography, a compact nav, and focused CTAs. I will keep the layout implementation-first so we can wire API behaviors later.',
  },
  {
    id: 'm4',
    role: 'user',
    text: 'Make the hero feel crisp and add a secondary action.',
  },
]

function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const isDark = theme === 'dark'

  return (
    <div className={`theme-${theme} min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]`}>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_380px]">
        <aside className="flex min-h-[260px] flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--sidebar-bg)] p-3 md:min-h-screen md:border-r md:border-b-0">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold tracking-[-0.02em]">
              Funky Workspace
            </span>
            <Button size="icon" variant="ghost" aria-label="Create chat">
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 pt-1">
            {chatGroups.map((group) => (
              <section className="flex flex-col gap-0.5" key={group.label}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {group.label}
                </p>
                {group.items.map((item, index) => {
                  const isActive = group.label === 'Today' && index === 0

                  return (
                    <button
                      className={`flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-left text-[13px] text-[var(--text-primary)] transition-colors ${
                        isActive ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                      key={item}
                      type="button"
                    >
                      <MessageSquare className="size-[14px] text-[var(--text-muted)]" />
                      <span>{item}</span>
                    </button>
                  )
                })}
              </section>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] px-1 pt-2 text-[var(--text-muted)]">
            <Sun className={`size-4 ${!isDark ? 'text-[var(--text-primary)]' : ''}`} />
            <Switch
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
            <Moon className={`size-4 ${isDark ? 'text-[var(--text-primary)]' : ''}`} />
          </div>
        </aside>

        <main className="flex min-h-[38rem] flex-col bg-[var(--preview-shell)] xl:min-h-screen">
          <header className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label="Collapse sidebar">
                <PanelLeftClose className="size-[18px]" />
              </Button>
              <div className="flex items-center gap-0.5">
                <div className="rounded-[6px] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]">
                  index.html
                </div>
                <div className="rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
                  style.css
                </div>
                <div className="rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
                  main.jsx
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label="Refresh preview">
                <RefreshCw className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Open in new tab">
                <ExternalLink className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Download output">
                <Download className="size-4" />
              </Button>
            </div>
          </header>

          <section className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,var(--preview-glow),transparent_45%)] bg-[var(--preview-bg)] px-8 py-8">
            <div className="w-full max-w-[560px] pb-16">
              <div className="flex items-center justify-between pb-6">
                <div className="text-[18px] font-bold tracking-[-0.04em]">MyBrand</div>
                <nav className="flex items-center gap-6" aria-label="Preview site">
                  {navItems.map((item) => (
                    <a
                      className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      href="/"
                      key={item}
                      onClick={(event) => event.preventDefault()}
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <h1 className="max-w-[500px] text-[clamp(2.2rem,3vw,3rem)] font-bold leading-[1.05] tracking-[-0.05em] text-[var(--hero-title)]">
                  Build faster with our platform
                </h1>
                <p className="max-w-[420px] text-[14px] leading-[1.6] text-[var(--hero-subtitle)]">
                  The modern toolkit for developers who want to ship beautiful
                  products without the complexity.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Button>Get Started</Button>
                  <Button variant="secondary">Learn More</Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <section className="flex min-h-[340px] flex-col border-t border-[var(--border-subtle)] bg-[var(--chat-bg)] xl:min-h-screen xl:border-l xl:border-t-0">
          <header className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-[18px]" />
              <h2 className="text-sm font-semibold">Frontend Slides Agent</h2>
            </div>
            <div className="rounded-[10px] bg-[var(--surface-elevated)] px-2 py-[3px] text-[11px] font-medium text-[var(--text-muted)]">
              Claude Haiku 4.5
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
            {messages.map((message) => (
              <div
                className={`flex max-w-full gap-2.5 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
                key={message.id}
              >
                {message.role === 'assistant' ? (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[13px] text-[var(--text-muted)]">
                    <Bot className="size-4" />
                  </div>
                ) : null}
                <div
                  className={`max-w-[270px] px-[14px] py-[10px] text-[13px] leading-[1.55] ${
                    message.role === 'user'
                      ? 'rounded-[12px_12px_4px_12px] bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)]'
                      : 'rounded-[12px_12px_12px_4px] bg-[var(--assistant-bubble-bg)] text-[var(--assistant-bubble-text)]'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            <div className="flex max-w-full gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                <Bot className="size-4" />
              </div>
              <div className="rounded-[12px_12px_12px_4px] bg-[var(--assistant-bubble-bg)] px-[14px] py-[10px] text-[13px] italic text-[var(--text-muted)]">
                Generating...
              </div>
            </div>
          </div>

          <footer className="flex flex-col gap-2.5 border-t border-[var(--border-subtle)] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  className="h-8 rounded-[16px] border border-[var(--border-subtle)] bg-transparent px-3 text-xs text-[var(--text-primary)] whitespace-nowrap transition-colors hover:bg-[var(--surface-hover)]"
                  key={action}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <label className="flex min-h-9 w-full items-center gap-2 rounded-[8px] bg-[var(--surface-elevated)] px-[14px] py-[10px] text-[13px] text-[var(--text-muted)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                <textarea
                  className="h-4 w-full resize-none bg-transparent text-[13px] leading-none text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  placeholder="Describe changes to your HTML..."
                  rows={1}
                />
                <Paperclip className="size-4 shrink-0" />
              </label>
              <Button
                className="size-9 rounded-[8px] p-0"
                size="icon"
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>

            <div className="text-center text-[11px] text-[var(--text-muted)]">
              Press Enter to send, Shift+Enter for new line
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}

export default App
