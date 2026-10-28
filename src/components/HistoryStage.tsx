import { Database, Download } from 'lucide-react'
import { reportUrl } from '../services/api'
import type { TestHistoryItem } from '../types/ping'
import { ErrorBanner } from './ErrorBanner'

interface HistoryStageProps {
  history: TestHistoryItem[]
  loading: boolean
  error: string
  retentionDays: number
}

export function HistoryStage({ history, loading, error, retentionDays }: HistoryStageProps) {
  return <div className="page simple-page">
    <div className="page-title"><div><span className="eyebrow">Backend history</span><h1>Test history</h1><p>Completed tests and reports are retained for {retentionDays} days.</p></div></div>
    {error && <ErrorBanner title="Unable to load test history" message={error} />}
    <section className="data-panel">
      <div className="history-header"><span>Date</span><span>Devices</span><span>Reachable</span><span>Failed</span><span>Duration</span><span>Status</span><span>Reports</span></div>
      {loading ? <div className="large-empty"><Database size={25} /><strong>Loading test history</strong><span>Retrieving retained tests from the service.</span></div> : history.length ? history.map((item) => <div className="history-row" key={item.id}><span>{new Date(item.date).toLocaleString()}</span><strong>{item.total}</strong><span>{item.reachable}</span><span>{item.failed}</span><span>{item.duration.toFixed(1)}s</span><span className={`status-label ${item.status === 'completed' ? 'valid' : 'warning'}`}>{item.status}</span><span className="history-downloads">{(['txt', 'csv', 'xlsx', 'json'] as const).map((format) => <a key={format} href={reportUrl(item.id, format)} title={`Download ${format.toUpperCase()} report`}><Download size={13} />{format.toUpperCase()}</a>)}</span></div>) : <div className="large-empty"><Database size={25} /><strong>No retained tests</strong><span>Completed tests from the last {retentionDays} days will appear here.</span></div>}
    </section>
  </div>
}