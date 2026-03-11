import { useEffect, useState } from 'react'
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
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Sun,
} from 'lucide-react'
import { Button } from './components/ui/button'
import { Switch } from './components/ui/switch'
import { createChat, deleteChat, listChats, type ChatSummary } from './api/chats'

type ThemeMode = 'dark' | 'light'

type SidebarChatGroup = {
  label: string
  items: ChatSummary[]
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type ChatContextMenuState = {
  chat: ChatSummary
  x: number
  y: number
}

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
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ChatContextMenuState | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const isDark = theme === 'dark'
  const chatGroups = groupChatsByDate(chats)

  useEffect(() => {
    let cancelled = false

    async function loadSidebarChats() {
      try {
        setIsLoadingChats(true)
        setChatError(null)
        const nextChats = await listChats()

        if (cancelled) {
          return
        }

        setChats(nextChats)
        setActiveChatId((current) => current ?? nextChats[0]?.id ?? null)
      } catch (error) {
        if (cancelled) {
          return
        }

        setChatError(getErrorMessage(error))
      } finally {
        if (!cancelled) {
          setIsLoadingChats(false)
        }
      }
    }

    void loadSidebarChats()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!contextMenu) {
      return
    }

    function handleCloseMenu() {
      setContextMenu(null)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('click', handleCloseMenu)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('click', handleCloseMenu)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu])

  async function handleCreateChat() {
    try {
      setIsCreatingChat(true)
      setChatError(null)
      const nextChat = await createChat()

      setChats((currentChats) => {
        const dedupedChats = currentChats.filter((chat) => chat.id !== nextChat.id)
        return [nextChat, ...dedupedChats]
      })
      setActiveChatId(nextChat.id)
    } catch (error) {
      setChatError(getErrorMessage(error))
    } finally {
      setIsCreatingChat(false)
    }
  }

  async function handleDeleteChat(chat: ChatSummary) {
    try {
      setDeletingChatId(chat.id)
      setContextMenu(null)
      setChatError(null)
      await deleteChat(chat.id)

      setChats((currentChats) => {
        const nextChats = currentChats.filter((currentChat) => currentChat.id !== chat.id)

        setActiveChatId((currentActiveChatId) => {
          if (currentActiveChatId !== chat.id) {
            return currentActiveChatId
          }

          return nextChats[0]?.id ?? null
        })

        return nextChats
      })
    } catch (error) {
      setChatError(getErrorMessage(error))
    } finally {
      setDeletingChatId(null)
    }
  }

  return (
    <div className={`theme-${theme} min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]`}>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_380px]">
        <aside className="flex min-h-[260px] flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--sidebar-bg)] p-3 md:min-h-screen md:border-r md:border-b-0">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold tracking-[-0.02em]">
              Funky Workspace
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Create chat"
              disabled={isCreatingChat}
              onClick={() => void handleCreateChat()}
            >
              {isCreatingChat ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 pt-1">
            {isLoadingChats ? (
              <div className="px-1 pt-1 text-sm text-[var(--text-muted)]">
                Loading chats...
              </div>
            ) : null}

            {chatError ? (
              <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-3 py-2 text-xs text-[var(--text-muted)]">
                {chatError}
              </div>
            ) : null}

            {!isLoadingChats && !chatError && chatGroups.length === 0 ? (
              <div className="px-1 pt-1 text-sm text-[var(--text-muted)]">
                No chats yet.
              </div>
            ) : null}

            {chatGroups.map((group) => (
              <section className="flex flex-col gap-0.5" key={group.label}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {group.label}
                </p>
                {group.items.map((chat) => {
                  const isActive = chat.id === activeChatId

                  return (
                    <button
                      className={`flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-left text-[13px] text-[var(--text-primary)] transition-colors ${
                        isActive ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                      disabled={deletingChatId === chat.id}
                      key={chat.id}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setContextMenu({
                          chat,
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }}
                      onClick={() => setActiveChatId(chat.id)}
                      type="button"
                      title="Right click to delete"
                    >
                      <MessageSquare className="size-[14px] text-[var(--text-muted)]" />
                      <span className="truncate">{chat.title}</span>
                    </button>
                  )
                })}
              </section>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] px-1 pt-2 text-[var(--text-muted)]">
            <Sun
              className={`size-4 transition-all duration-300 ${!isDark ? 'scale-100 text-[var(--text-primary)]' : 'scale-90 text-[var(--text-muted)]'}`}
            />
            <Switch
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
            <Moon
              className={`size-4 transition-all duration-300 ${isDark ? 'scale-100 text-[var(--text-primary)]' : 'scale-90 text-[var(--text-muted)]'}`}
            />
          </div>
        </aside>

        {contextMenu ? (
          <div
            className="fixed z-50 min-w-36 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--sidebar-bg)] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 60),
            }}
          >
            <button
              className="flex w-full items-center rounded-[8px] px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-[var(--surface-hover)]"
              disabled={deletingChatId === contextMenu.chat.id}
              onClick={() => void handleDeleteChat(contextMenu.chat)}
              type="button"
            >
              Delete
            </button>
          </div>
        ) : null}

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

function groupChatsByDate(chats: ChatSummary[]): SidebarChatGroup[] {
  const sortedChats = [...chats].sort((left, right) => {
    const leftTimestamp = Date.parse(left.updatedAt ?? left.createdAt ?? '') || 0
    const rightTimestamp = Date.parse(right.updatedAt ?? right.createdAt ?? '') || 0

    return rightTimestamp - leftTimestamp
  })

  const today: ChatSummary[] = []
  const yesterday: ChatSummary[] = []
  const earlier: ChatSummary[] = []

  for (const chat of sortedChats) {
    const targetGroup = getRelativeChatBucket(chat)

    if (targetGroup === 'Today') {
      today.push(chat)
      continue
    }

    if (targetGroup === 'Yesterday') {
      yesterday.push(chat)
      continue
    }

    earlier.push(chat)
  }

  return [
    { label: 'Today', items: today },
    { label: 'Yesterday', items: yesterday },
    { label: 'Earlier', items: earlier },
  ].filter((group) => group.items.length > 0)
}

function getRelativeChatBucket(chat: ChatSummary) {
  const rawDate = chat.updatedAt ?? chat.createdAt

  if (!rawDate) {
    return 'Earlier'
  }

  const parsedDate = new Date(rawDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Earlier'
  }

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)

  if (parsedDate >= startOfToday) {
    return 'Today'
  }

  if (parsedDate >= startOfYesterday) {
    return 'Yesterday'
  }

  return 'Earlier'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong while loading chats.'
}
