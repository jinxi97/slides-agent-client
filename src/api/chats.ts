export type ChatSummary = {
  id: string
  title: string
  createdAt?: string
  updatedAt?: string
}

export type TextBlock = { type: 'text'; text: string }
export type ToolBlock = { type: 'tool'; name: string; input: Record<string, unknown> }
export type ContentBlock = TextBlock | ToolBlock

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  blocks?: ContentBlock[]
  createdAt?: string
}

type CreateChatPayload = {
  title?: string | null
}

type JsonRecord = Record<string, unknown>

const API_BASE_URL = __API_BASE_URL__
const WORKSPACE_ID = __WORKSPACE_ID__

function buildApiUrl(path: string) {
  const baseUrl = API_BASE_URL.trim()

  if (!baseUrl) {
    return path
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function getWorkspaceId() {
  const workspaceId = WORKSPACE_ID.trim()

  if (!workspaceId || workspaceId === '__WORKSPACE_ID__') {
    throw new Error('Workspace macro is not set.')
  }

  return workspaceId
}

function getTextValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function getObject(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null ? (value as JsonRecord) : null
}

function getChatCandidateList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  const record = getObject(payload)

  if (!record) {
    return []
  }

  const nestedKeys = ['items', 'data', 'results', 'chats']

  for (const key of nestedKeys) {
    const candidate = record[key]

    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

function normalizeChat(chat: unknown, index: number): ChatSummary | null {
  const record = getObject(chat)

  if (!record) {
    return null
  }

  const id =
    getTextValue(record.id) ||
    getTextValue(record.chat_id) ||
    getTextValue(record.uuid) ||
    `chat-${index}`

  const title =
    getTextValue(record.title) ||
    getTextValue(record.name) ||
    getTextValue(record.subject) ||
    'Untitled chat'

  const createdAt =
    getTextValue(record.created_at) || getTextValue(record.createdAt) || undefined
  const updatedAt =
    getTextValue(record.updated_at) ||
    getTextValue(record.updatedAt) ||
    createdAt ||
    undefined

  return {
    id,
    title,
    createdAt,
    updatedAt,
  }
}

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export async function listChats() {
  const workspaceId = getWorkspaceId()
  const payload = await requestJson(
    `/workspaces/${encodeURIComponent(workspaceId)}/chats`,
  )

  return getChatCandidateList(payload)
    .map((chat, index) => normalizeChat(chat, index))
    .filter((chat): chat is ChatSummary => chat !== null)
}

export async function createChat(input: CreateChatPayload = {}) {
  const workspaceId = getWorkspaceId()
  const payload = await requestJson(
    `/workspaces/${encodeURIComponent(workspaceId)}/chats`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: input.title ?? null,
      }),
    },
  )

  return normalizeChat(payload, 0) ?? {
    id: `chat-${Date.now()}`,
    title: input.title || 'Untitled chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteChat(chatId: string) {
  const workspaceId = getWorkspaceId()

  await requestJson(
    `/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
    {
      method: 'DELETE',
    },
  )
}

function parseContentBlocks(raw: unknown): ContentBlock[] | null {
  if (!Array.isArray(raw)) {
    return null
  }

  const blocks: ContentBlock[] = []

  for (const item of raw) {
    const obj = getObject(item)
    if (!obj) continue

    const type = getTextValue(obj.type)

    if (type === 'text') {
      const text = getTextValue(obj.content) || getTextValue(obj.text)
      if (text) {
        blocks.push({ type: 'text', text })
      }
    } else if (type === 'tool') {
      const name = getTextValue(obj.name)
      if (name) {
        const input = (getObject(obj.input) ?? {}) as Record<string, unknown>
        blocks.push({ type: 'tool', name, input })
      }
    }
  }

  return blocks.length > 0 ? blocks : null
}

function normalizeMessage(message: unknown, index: number): ChatMessage | null {
  const record = getObject(message)

  if (!record) {
    return null
  }

  const id =
    getTextValue(record.id) ||
    getTextValue(record.message_id) ||
    `msg-${index}`

  const role = getTextValue(record.role)

  if (role !== 'user' && role !== 'assistant') {
    return null
  }

  // content may be a string (user messages) or an array of blocks (assistant messages)
  const blocks = parseContentBlocks(record.content)

  const content = blocks
    ? blocks
        .filter((b): b is TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
    : getTextValue(record.content) ||
      getTextValue(record.text) ||
      getTextValue(record.message) ||
      ''

  const createdAt =
    getTextValue(record.created_at) || getTextValue(record.createdAt) || undefined

  return { id, role, content, blocks: blocks ?? undefined, createdAt }
}

export async function getMessages(chatId: string) {
  const workspaceId = getWorkspaceId()
  const payload = await requestJson(
    `/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}/messages`,
  )

  const candidates = getChatCandidateList(payload)

  return candidates
    .map((msg, index) => normalizeMessage(msg, index))
    .filter((msg): msg is ChatMessage => msg !== null)
}

export async function answerQuestion(
  chatId: string,
  answers: Record<string, string>,
): Promise<void> {
  const workspaceId = getWorkspaceId()
  await requestJson(
    `/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
  )
}

export type SendMessageCallbacks = {
  onBlocks?: (blocks: ContentBlock[]) => void
}

export async function sendMessage(
  chatId: string,
  content: string,
  callbacks: SendMessageCallbacks = {},
) {
  const workspaceId = getWorkspaceId()
  const url = buildApiUrl(
    `/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}/messages`,
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  // If it's a regular JSON response, parse normally
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = await response.json()
    const candidates = getChatCandidateList(payload)

    if (candidates.length > 0) {
      return candidates
        .map((msg, index) => normalizeMessage(msg, index))
        .filter((msg): msg is ChatMessage => msg !== null)
    }

    const single = normalizeMessage(payload, 0)
    return single ? [single] : []
  }

  // Handle SSE stream
  const reader = response.body?.getReader()

  if (!reader) {
    return []
  }

  const decoder = new TextDecoder()
  let buffer = ''
  const blocks: ContentBlock[] = []

  for (;;) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    // Keep the last incomplete line in the buffer
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) {
        continue
      }

      const data = line.slice(6).trim()

      if (data === '[DONE]') {
        continue
      }

      try {
        const event = JSON.parse(data) as JsonRecord
        const eventType = getTextValue(event.type)

        if (eventType === 'text') {
          const text = getTextValue(event.content)

          if (text) {
            // Append to the last text block, or create a new one
            const lastBlock = blocks[blocks.length - 1]

            if (lastBlock && lastBlock.type === 'text') {
              lastBlock.text += text
            } else {
              blocks.push({ type: 'text', text })
            }

            callbacks.onBlocks?.([...blocks])
          }
        } else if (eventType === 'tool') {
          const name = getTextValue(event.name)
          const input = (getObject(event.input) ?? {}) as Record<string, unknown>

          if (name) {
            blocks.push({ type: 'tool', name, input })
            callbacks.onBlocks?.([...blocks])
          }
        }
        // Skip 'done' and other event types
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  return blocks
}
