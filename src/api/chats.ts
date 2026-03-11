export type ChatSummary = {
  id: string
  title: string
  createdAt?: string
  updatedAt?: string
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
