export type DeviceType = 'IPv4' | 'IPv6' | 'Hostname' | 'Unknown'
export type DeviceStatus = 'valid' | 'warning' | 'invalid' | 'duplicate'
export type AppView = 'dashboard' | 'review' | 'configure' | 'running' | 'history' | 'settings'
export type PingStatus = 'REACHABLE' | 'UNREACHABLE' | 'TIMEOUT' | 'ERROR'

export interface DeviceTarget {
  id: string
  value: string
  type: DeviceType
  status: DeviceStatus
  source: string
  duplicateOf?: string
}

export interface PingConfiguration {
  packets: number
  timeout: number
  concurrency: number
  high_latency_ms: number
}

export interface ServerConfiguration {
  large_test_threshold: number
  max_upload_bytes: number
  history_retention_days: number
  state_storage: string
  capabilities: {
    packets: boolean
    timeout: boolean
    concurrency: boolean
    cancellation: boolean
    pause: boolean
    retry: boolean
    ip_version_selection: boolean
  }
}

export interface PingResult {
  device: string
  timestamp: string
  status: PingStatus
  packet_loss?: string
  avg_time?: string
  error?: string
}

export interface JobSnapshot {
  id: string
  status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'
  started_at: string | null
  finished_at: string | null
  duration: number
  total: number
  completed: number
  counts: Record<'reachable' | 'unreachable' | 'timeout' | 'error', number>
  latency: { average: number | null; minimum: number | null; maximum: number | null }
  results: PingResult[]
  error: string | null
}

export interface ImportSheet {
  name: string
  columns: string[]
  rows: string[][]
}

export type ImportResponse =
  | { kind: 'text'; text: string }
  | { kind: 'tabular'; sheets: ImportSheet[] }

export interface TestHistoryItem {
  id: string
  date: string
  total: number
  reachable: number
  failed: number
  duration: number
  status: JobSnapshot['status']
}