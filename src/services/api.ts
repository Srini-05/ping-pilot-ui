import type { ImportResponse, JobSnapshot, PingConfiguration, PingResult, ServerConfiguration, TestHistoryItem } from '../types/ping'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function errorMessage(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    const messages = value.map(errorMessage).filter((message): message is string => Boolean(message))
    return messages.length ? messages.join('; ') : null
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return errorMessage(record.detail) ?? errorMessage(record.message) ?? errorMessage(record.error) ?? errorMessage(record.msg)
  }
  return null
}

export function getErrorMessage(caught: unknown, fallback: string): string {
  return errorMessage(caught) ?? fallback
}

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const responseBody = await response.text().catch(() => '')
    let payload: unknown = responseBody
    try { payload = JSON.parse(responseBody) as unknown }
    catch { /* Plain-text error response. */ }
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
    throw new Error(errorMessage(payload) ?? `Request failed (${status})`)
  }
  return response.json() as Promise<T>
}

export async function getServerConfiguration(): Promise<ServerConfiguration> {
  return responseJson(await fetch(`${API_BASE}/api/config`))
}

export async function getTestHistory(): Promise<TestHistoryItem[]> {
  return responseJson(await fetch(`${API_BASE}/api/tests`))
}

export async function importDeviceFile(file: File): Promise<ImportResponse> {
  const body = new FormData()
  body.append('file', file)
  return responseJson(await fetch(`${API_BASE}/api/import`, { method: 'POST', body }))
}

export async function startPingTest(targets: string[], configuration: PingConfiguration): Promise<{ id: string }> {
  return responseJson(await fetch(`${API_BASE}/api/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets, configuration }),
  }))
}

export function subscribeToTest(
  jobId: string,
  handlers: {
    snapshot: (snapshot: JobSnapshot) => void
    result: (payload: { result: PingResult; completed: number; total: number }) => void
    finished: (snapshot: JobSnapshot) => void
    error: () => void
  },
): () => void {
  const source = new EventSource(`${API_BASE}/api/tests/${jobId}/events`)
  source.addEventListener('snapshot', (event) => handlers.snapshot(JSON.parse((event as MessageEvent).data) as JobSnapshot))
  source.addEventListener('result', (event) => handlers.result(JSON.parse((event as MessageEvent).data)))
  source.addEventListener('finished', (event) => {
    handlers.finished(JSON.parse((event as MessageEvent).data) as JobSnapshot)
    source.close()
  })
  source.onerror = handlers.error
  return () => source.close()
}

export async function cancelPingTest(jobId: string): Promise<void> {
  await responseJson(await fetch(`${API_BASE}/api/tests/${jobId}/cancel`, { method: 'POST' }))
}

export function reportUrl(jobId: string, format: 'txt' | 'csv' | 'xlsx' | 'json'): string {
  return `${API_BASE}/api/tests/${jobId}/export/${format}`
}