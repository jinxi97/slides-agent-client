import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Bot,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Paperclip,
  Pencil,
  Plus,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Sun,
  Terminal,
  Wrench,
} from 'lucide-react'
import Markdown from 'react-markdown'
import { Button } from './components/ui/button'
import { Switch } from './components/ui/switch'
import {
  answerQuestion,
  createChat,
  deleteChat,
  fetchWithAuth,
  getArtifacts,
  getFileDownloadUrl,
  getMessages,
  listChats,
  sendMessage,
  type ChatMessage,
  type ChatSummary,
  type ContentBlock,
} from './api/chats'

type ThemeMode = 'dark' | 'light'

type SidebarChatGroup = {
  label: string
  items: ChatSummary[]
}

type ChatContextMenuState = {
  chat: ChatSummary
  x: number
  y: number
}

const quickActions = ['Help me create a pitch deck', 'Change to neon style']

function App({ onSignOut }: { onSignOut?: () => void }) {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ChatContextMenuState | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState<{
    questions: AskUserQuestion[]
    currentIndex: number
    answers: string[]
  } | null>(null)
  const [artifactFiles, setArtifactFiles] = useState<string[]>([])
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null)
  const [artifactVersion, setArtifactVersion] = useState(0)
  const [artifactBlobUrl, setArtifactBlobUrl] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isInitialScrollRef = useRef(true)
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

  useEffect(() => {
    if (!activeChatId) {
      setMessages([])
      return
    }

    isInitialScrollRef.current = true
    let cancelled = false

    async function loadMessages() {
      try {
        setIsLoadingMessages(true)
        const nextMessages = await getMessages(activeChatId!)

        if (!cancelled) {
          setMessages(nextMessages)
        }
      } catch {
        if (!cancelled) {
          setMessages([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false)
        }
      }
    }

    void loadMessages()

    return () => {
      cancelled = true
    }
  }, [activeChatId])

  useEffect(() => {
    const behavior = isInitialScrollRef.current ? 'instant' : 'smooth'
    messagesEndRef.current?.scrollIntoView({ behavior })
    isInitialScrollRef.current = false
  }, [messages])

  useEffect(() => {
    if (!activeArtifact) {
      setArtifactBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    let revoked = false
    const url = getFileDownloadUrl(activeArtifact)

    fetchWithAuth(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch artifact')
        return res.blob()
      })
      .then((blob) => {
        if (revoked) return
        // Re-create blob with correct MIME type based on extension
        const ext = activeArtifact.split('.').pop()?.toLowerCase()
        const mimeMap: Record<string, string> = {
          html: 'text/html',
          css: 'text/css',
          js: 'application/javascript',
          json: 'application/json',
          svg: 'image/svg+xml',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
        }
        const mime = mimeMap[ext ?? ''] ?? blob.type
        const typed = new Blob([blob], { type: mime })
        const blobUrl = URL.createObjectURL(typed)
        setArtifactBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return blobUrl
        })
      })
      .catch(() => {
        if (!revoked) setArtifactBlobUrl(null)
      })

    return () => {
      revoked = true
      setArtifactBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [activeArtifact, artifactVersion])

  // Poll artifacts from backend
  useEffect(() => {
    if (!activeChatId) {
      setArtifactFiles([])
      setActiveArtifact(null)
      return
    }

    let cancelled = false
    let prevSnapshot = ''

    async function fetchArtifacts() {
      try {
        const paths = await getArtifacts(activeChatId!)
        if (cancelled) return

        // Only update state when the list actually changes
        const snapshot = JSON.stringify(paths)
        if (snapshot === prevSnapshot) return
        prevSnapshot = snapshot

        setArtifactFiles(paths)
        if (paths.length > 0) {
          setActiveArtifact((current) =>
            current && paths.includes(current) ? current : paths[paths.length - 1],
          )
          setArtifactVersion((v) => v + 1)
        } else {
          setActiveArtifact(null)
        }
      } catch {
        // ignore polling errors
      }
    }

    // Initial fetch
    void fetchArtifacts()

    // Poll every 3s while the agent is active
    if (isSendingMessage) {
      const interval = setInterval(() => void fetchArtifacts(), 3000)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }

    return () => {
      cancelled = true
    }
  }, [activeChatId, isSendingMessage])

  async function handleSendMessage(content: string) {
    const trimmed = content.trim()

    if (!trimmed || !activeChatId || isSendingMessage) {
      return
    }

    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setMessageInput('')
    setIsSendingMessage(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = ''
    }

    const streamingId = `streaming-${Date.now()}`
    let lastSeenBlockCount = 0

    try {
      const result = await sendMessage(activeChatId, trimmed, {
        onBlocks(blocks) {
          // Check new blocks for AskUserQuestion
          for (let i = lastSeenBlockCount; i < blocks.length; i++) {
            const block = blocks[i]
            if (block.type !== 'tool') continue

            if (block.name === 'AskUserQuestion') {
              const questions = Array.isArray(block.input.questions)
                ? (block.input.questions as AskUserQuestion[])
                : []
              if (questions.length > 0) {
                setPendingQuestion({ questions, currentIndex: 0, answers: [] })
              }
            }
          }
          lastSeenBlockCount = blocks.length

          const textContent = blocks
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map((b) => b.text)
            .join('')

          setMessages((prev) => {
            const existing = prev.find((m) => m.id === streamingId)

            if (existing) {
              return prev.map((m) =>
                m.id === streamingId
                  ? { ...m, content: textContent, blocks: [...blocks] }
                  : m,
              )
            }

            return [
              ...prev,
              {
                id: streamingId,
                role: 'assistant' as const,
                content: textContent,
                blocks: [...blocks],
              },
            ]
          })
        },
      })

      // After streaming completes, ensure the message is present
      if (Array.isArray(result) && result.length > 0) {
        const finalBlocks = result as ContentBlock[]
        const textContent = finalBlocks
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
          .join('')

        setMessages((prev) => {
          const hasStreaming = prev.some((m) => m.id === streamingId)

          if (!hasStreaming) {
            return [
              ...prev,
              {
                id: streamingId,
                role: 'assistant' as const,
                content: textContent,
                blocks: finalBlocks,
              },
            ]
          }

          return prev
        })
      }

    } catch (error) {
      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMessage.id && m.id !== streamingId),
      )
      setChatError(getErrorMessage(error))
    } finally {
      setIsSendingMessage(false)
    }
  }

  function handleSelectOption(label: string) {
    if (!pendingQuestion) return

    const nextAnswers = [...pendingQuestion.answers, label]
    const nextIndex = pendingQuestion.currentIndex + 1

    if (nextIndex >= pendingQuestion.questions.length) {
      // All questions answered — build answers map and unblock the backend
      const answersMap: Record<string, string> = {}
      pendingQuestion.questions.forEach((q, i) => {
        answersMap[q.question] = nextAnswers[i]
      })
      setPendingQuestion(null)
      void answerQuestion(activeChatId!, answersMap)
    } else {
      // More questions — advance to next
      setPendingQuestion({
        ...pendingQuestion,
        currentIndex: nextIndex,
        answers: nextAnswers,
      })
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage(messageInput)
    }
  }

  function handleTextareaInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessageInput(event.target.value)

    // Auto-resize
    const textarea = event.target
    textarea.style.height = ''
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

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
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] xl:h-screen xl:grid-cols-[260px_minmax(0,1fr)_380px] xl:overflow-hidden">
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

          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-1 pt-2 text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
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
            {onSignOut && (
              <button
                className="rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                onClick={onSignOut}
              >
                Sign out
              </button>
            )}
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
            <div className="flex items-center gap-1 overflow-hidden">
              <Button size="icon" variant="ghost" aria-label="Collapse sidebar">
                <PanelLeftClose className="size-[18px]" />
              </Button>
              <div className="flex items-center gap-0.5 overflow-x-auto">
                {artifactFiles.length > 0
                  ? artifactFiles.map((file) => (
                      <button
                        className={`shrink-0 rounded-[6px] px-2.5 py-1.5 text-xs transition-colors ${
                          file === activeArtifact
                            ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        key={file}
                        onClick={() => setActiveArtifact(file)}
                        type="button"
                      >
                        {getFileName(file)}
                      </button>
                    ))
                  : (
                    <span className="px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
                      No artifacts yet
                    </span>
                  )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Refresh preview"
                onClick={() => setArtifactVersion((v) => v + 1)}
              >
                <RefreshCw className="size-4" />
              </Button>
              {activeArtifact ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Open in new tab"
                  onClick={() => window.open(getFileDownloadUrl(activeArtifact), '_blank')}
                >
                  <ExternalLink className="size-4" />
                </Button>
              ) : null}
              <Button size="icon" variant="ghost" aria-label="Download output">
                <Download className="size-4" />
              </Button>
            </div>
          </header>

          {activeArtifact && artifactBlobUrl ? (
            <iframe
              className="flex-1 border-0 bg-white"
              key={`${activeArtifact}-${artifactVersion}`}
              src={artifactBlobUrl}
              title={activeArtifact}
            />
          ) : (
            <section className="flex flex-1 items-center justify-center bg-[var(--preview-bg)]">
              <div className="text-center text-sm text-[var(--text-muted)]">
                <p>Send a message to generate artifacts.</p>
              </div>
            </section>
          )}
        </main>

        <section className="flex min-h-[340px] flex-col overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--chat-bg)] xl:h-screen xl:min-h-0 xl:border-l xl:border-t-0">
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
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-8 text-sm text-[var(--text-muted)]">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Loading messages...
              </div>
            ) : messages.length === 0 && !isSendingMessage ? (
              <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
                Send a message to get started.
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === 'user' ? (
                <div className="flex max-w-full justify-end gap-2.5" key={message.id}>
                  <div className="max-w-[270px] rounded-[12px_12px_4px_12px] bg-[var(--user-bubble-bg)] px-[14px] py-[10px] text-[13px] leading-[1.55] whitespace-pre-wrap text-[var(--user-bubble-text)]">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="flex max-w-full gap-2.5" key={message.id}>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[13px] text-[var(--text-muted)]">
                    <Bot className="size-4" />
                  </div>
                  <div className="flex min-w-0 max-w-[270px] flex-col gap-2">
                    {message.blocks && message.blocks.length > 0
                      ? message.blocks.map((block, index) =>
                          block.type === 'text' ? (
                            <div
                              className="prose-chat rounded-[12px_12px_12px_4px] bg-[var(--assistant-bubble-bg)] px-[14px] py-[10px] text-[13px] leading-[1.55] text-[var(--assistant-bubble-text)]"
                              key={index}
                            >
                              <Markdown>{block.text}</Markdown>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-[12px] text-[var(--text-muted)]"
                              key={index}
                            >
                              {getToolIcon(block.name)}
                              <span className="font-medium">{block.name}</span>
                              {getToolDetail(block) ? (
                                <>
                                  <ChevronRight className="size-3 shrink-0" />
                                  <span className="truncate">{getToolDetail(block)}</span>
                                </>
                              ) : null}
                            </div>
                          ),
                        )
                      : (
                        <div className="prose-chat rounded-[12px_12px_12px_4px] bg-[var(--assistant-bubble-bg)] px-[14px] py-[10px] text-[13px] leading-[1.55] text-[var(--assistant-bubble-text)]">
                          <Markdown>{message.content}</Markdown>
                        </div>
                      )}
                  </div>
                </div>
              ),
            )}

            {isSendingMessage && !messages.some((m) => m.id.startsWith('streaming-')) ? (
              <div className="flex max-w-full gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-[12px_12px_12px_4px] bg-[var(--assistant-bubble-bg)] px-[14px] py-[10px] text-[13px] italic text-[var(--text-muted)]">
                  Generating...
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <footer className="flex flex-col gap-2.5 border-t border-[var(--border-subtle)] px-4 py-3">
            {pendingQuestion ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <CircleHelp className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="text-[13px] leading-[1.55] text-[var(--text-primary)]">
                    {pendingQuestion.questions[pendingQuestion.currentIndex].question}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {pendingQuestion.questions[pendingQuestion.currentIndex].options.map((opt, oi) => (
                    <button
                      className="flex flex-col gap-0.5 rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                      key={oi}
                      onClick={() => handleSelectOption(opt.label)}
                      type="button"
                    >
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">
                        {opt.label}
                      </span>
                      {opt.description ? (
                        <span className="text-[11px] leading-[1.4] text-[var(--text-muted)]">
                          {opt.description}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {pendingQuestion.questions.length > 1 ? (
                  <div className="text-center text-[11px] text-[var(--text-muted)]">
                    Question {pendingQuestion.currentIndex + 1} of {pendingQuestion.questions.length}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {messages.length === 0 && !isSendingMessage && !isLoadingMessages ? (
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action) => (
                      <button
                        className="h-8 rounded-[16px] border border-[var(--border-subtle)] bg-transparent px-3 text-xs text-[var(--text-primary)] whitespace-nowrap transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                        disabled={!activeChatId || isSendingMessage}
                        key={action}
                        onClick={() => void handleSendMessage(action)}
                        type="button"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <label className="flex min-h-9 w-full items-center gap-2 rounded-[8px] bg-[var(--surface-elevated)] px-[14px] py-[10px] text-[13px] text-[var(--text-muted)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                    <textarea
                      ref={textareaRef}
                      className="h-4 w-full resize-none bg-transparent text-[13px] leading-none text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                      disabled={!activeChatId || isSendingMessage}
                      onChange={handleTextareaInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe changes to your HTML..."
                      rows={1}
                      value={messageInput}
                    />
                    <Paperclip className="size-4 shrink-0" />
                  </label>
                  <Button
                    className="size-9 rounded-[8px] p-0"
                    disabled={!activeChatId || isSendingMessage || !messageInput.trim()}
                    onClick={() => void handleSendMessage(messageInput)}
                    size="icon"
                    aria-label="Send message"
                  >
                    {isSendingMessage ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </Button>
                </div>

                <div className="text-center text-[11px] text-[var(--text-muted)]">
                  Press Enter to send, Shift+Enter for new line
                </div>
              </>
            )}
          </footer>
        </section>
      </div>
    </div>
  )
}

export default App

type AskUserQuestionOption = {
  label: string
  description?: string
}

type AskUserQuestion = {
  question: string
  header?: string
  options: AskUserQuestionOption[]
  multiSelect?: boolean
}

function getToolIcon(name: string) {
  switch (name) {
    case 'Read':
      return <FileText className="size-3.5 shrink-0" />
    case 'Write':
    case 'Edit':
      return <Pencil className="size-3.5 shrink-0" />
    case 'Bash':
      return <Terminal className="size-3.5 shrink-0" />
    case 'AskUserQuestion':
      return <CircleHelp className="size-3.5 shrink-0" />
    default:
      return <Wrench className="size-3.5 shrink-0" />
  }
}

function getToolDetail(block: { name: string; input: Record<string, unknown> }) {
  const input = block.input

  if (block.name === 'Read' || block.name === 'Write' || block.name === 'Edit') {
    const filePath = input.file_path ?? input.path

    if (typeof filePath === 'string') {
      const segments = filePath.split('/')
      return segments.slice(-2).join('/')
    }
  }

  if (block.name === 'Bash') {
    const command = input.command

    if (typeof command === 'string') {
      return command.length > 40 ? `${command.slice(0, 40)}...` : command
    }
  }

  if (block.name === 'Skill') {
    const skill = input.skill

    if (typeof skill === 'string') {
      return skill
    }
  }

  if (block.name === 'AskUserQuestion') {
    const questions = input.questions

    if (Array.isArray(questions) && questions.length > 0) {
      const first = questions[0] as Record<string, unknown> | undefined
      const q = first?.question

      if (typeof q === 'string') {
        return q.length > 35 ? `${q.slice(0, 35)}...` : q
      }
    }
  }

  return null
}

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

function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong while loading chats.'
}
