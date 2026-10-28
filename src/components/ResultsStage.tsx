import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileJson, FileSpreadsheet, FileText, RotateCcw, Search, Square, TimerOff, XCircle } from 'lucide-react'
import type { JobSnapshot, PingConfiguration, PingResult } from '../types/ping'
import { reportUrl } from '../services/api'
import { ErrorBanner } from './ErrorBanner'
import { Modal } from './Modal'
import { WorkflowSteps } from './WorkflowSteps'

interface ResultsStageProps { jobId: string; snapshot: JobSnapshot | null; results: PingResult[]; config: PingConfiguration; streamError: string; onCancel: () => void; onRetryFailed: (results: PingResult[]) => void; onNew: () => void }

export function ResultsStage({ jobId, snapshot, results, config, streamError, onCancel, onRetryFailed, onNew }: ResultsStageProps) {
  const [filter, setFilter] = useState<'all' | 'up' | 'down' | 'timeout' | 'high'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [now, setNow] = useState(0)
  const isActive = !snapshot || snapshot.status === 'queued' || snapshot.status === 'running'
  useEffect(() => {
    if (!isActive || !snapshot?.started_at) return
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [isActive, snapshot?.started_at])
  const completed = snapshot?.completed ?? results.length
  const total = snapshot?.total ?? 0
  const progress = total ? Math.round(completed / total * 100) : 0
  const latencyOf = (result: PingResult) => result.avg_time && result.avg_time !== 'N/A' ? Number.parseFloat(result.avg_time) : null
  const liveLatencies = results.map(latencyOf).filter((value): value is number => value !== null)
  const liveAverageLatency = liveLatencies.length ? Number((liveLatencies.reduce((sum, value) => sum + value, 0) / liveLatencies.length).toFixed(2)) : null
  const liveMinimumLatency = liveLatencies.length ? Math.min(...liveLatencies) : null
  const liveMaximumLatency = liveLatencies.length ? Math.max(...liveLatencies) : null
  const liveDuration = snapshot?.started_at && now ? (now - new Date(snapshot.started_at).getTime()) / 1000 : 0
  const displayAverageLatency = isActive ? (liveAverageLatency ?? snapshot?.latency.average ?? null) : (snapshot?.latency.average ?? liveAverageLatency)
  const displayMinimumLatency = isActive ? (liveMinimumLatency ?? snapshot?.latency.minimum ?? null) : (snapshot?.latency.minimum ?? liveMinimumLatency)
  const displayMaximumLatency = isActive ? (liveMaximumLatency ?? snapshot?.latency.maximum ?? null) : (snapshot?.latency.maximum ?? liveMaximumLatency)
  const displayDurationSeconds = isActive ? Math.max(0, liveDuration) : (snapshot?.duration ?? 0)
  const shown = useMemo(() => results.filter((result) => {
    const latency = latencyOf(result)
    const matches = filter === 'all' || (filter === 'up' && result.status === 'REACHABLE') || (filter === 'down' && ['UNREACHABLE', 'ERROR'].includes(result.status)) || (filter === 'timeout' && result.status === 'TIMEOUT') || (filter === 'high' && result.status === 'REACHABLE' && latency !== null && latency > config.high_latency_ms)
    return matches && result.device.toLowerCase().includes(search.toLowerCase())
  }), [results, filter, search, config.high_latency_ms])
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize))
  const activePage = Math.min(page, pageCount)
  const pageStart = (activePage - 1) * pageSize
  const pageResults = shown.slice(pageStart, pageStart + pageSize)
  const failed = results.filter((result) => result.status !== 'REACHABLE')
  const reachable = results.filter((result) => result.status === 'REACHABLE').length
  const timeouts = results.filter((result) => result.status === 'TIMEOUT').length
  const down = results.length - reachable - timeouts

  return <div className="page results-page"><WorkflowSteps current={3} /><section className={`run-header ${isActive ? 'running' : snapshot?.status}`}><div><span className="run-status"><i /> {isActive ? 'Test running' : snapshot?.status === 'completed' ? 'Ping test completed' : snapshot?.status === 'cancelled' ? 'Test cancelled' : 'Test failed'}</span><h1>PingPilot</h1><p>{total.toLocaleString()} targets this run · {config.concurrency.toLocaleString()} simultaneous pings · Started {snapshot?.started_at ? new Date(snapshot.started_at).toLocaleString() : 'preparing…'}</p></div>{isActive ? <button className="danger-button" onClick={() => setConfirmCancelOpen(true)}><Square size={15} fill="currentColor" /> Cancel test</button> : <button className="secondary-button" onClick={onNew}><RotateCcw size={15} /> Start new test</button>}</section>
    {streamError && <ErrorBanner title="Ping test connection error" message={streamError} />}
    <section className="progress-panel"><div className="progress-copy"><strong>{progress}%</strong><span>{completed.toLocaleString()} / {total.toLocaleString()} completed</span></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></section>
    <div className="summary-grid result-summary"><div><span>Total</span><strong>{total.toLocaleString()}</strong></div><div className="good"><span>Up</span><strong>{reachable.toLocaleString()}</strong></div><div className="bad"><span>Down / error</span><strong>{down.toLocaleString()}</strong></div><div className="warn"><span>Timeout</span><strong>{timeouts.toLocaleString()}</strong></div></div>
    <div className="latency-strip"><div><span>Average latency</span><strong>{displayAverageLatency ?? '—'} <small>ms</small></strong></div><div><span>Minimum</span><strong>{displayMinimumLatency ?? '—'} <small>ms</small></strong></div><div><span>Maximum</span><strong>{displayMaximumLatency ?? '—'} <small>ms</small></strong></div><div><span>Duration</span><strong>{`${displayDurationSeconds.toFixed(1)}s`}</strong></div></div>
    <section className="data-panel"><div className="results-heading"><div><h2>Live results</h2><p>Results appear as each target completes.</p></div>{!isActive && <div className="export-menu">{(['txt', 'csv', 'xlsx', 'json'] as const).map((format) => <a key={format} href={reportUrl(jobId, format)}><Download size={14} /> {format.toUpperCase()}</a>)}</div>}</div><div className="result-tools"><div className="filter-tabs">{(['all', 'up', 'down', 'timeout', 'high'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setPage(1) }}>{value === 'high' ? 'High latency' : value}</button>)}</div><div className="search-box"><Search size={15} /><input aria-label="Search ping results" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search device / IP / hostname" /></div></div>
      <div className="table-scroll"><table className="results-table"><thead><tr><th>Device</th><th>Status</th><th>Latency</th><th>Sent</th><th>Received</th><th>Packet loss</th><th>Response</th><th>Timestamp</th></tr></thead><tbody>{pageResults.map((result, index) => { const latency = latencyOf(result); const loss = Number.parseFloat(result.packet_loss ?? '100'); const received = Math.max(0, Math.round(config.packets * (1 - loss / 100))); return <tr key={`${result.device}-${pageStart + index}`}><td><strong>{result.device}</strong>{latency !== null && latency > config.high_latency_ms && <span className="high-tag">High latency</span>}</td><td><span className={`ping-status ${result.status.toLowerCase()}`}>{result.status === 'REACHABLE' ? <CheckCircle2 size={14} /> : result.status === 'TIMEOUT' ? <TimerOff size={14} /> : <XCircle size={14} />}{result.status === 'REACHABLE' ? 'UP' : result.status}</span></td><td>{latency !== null ? `${latency} ms` : '—'}</td><td>{config.packets}</td><td>{received}</td><td>{result.packet_loss ?? '100%'}</td><td>{result.error ?? 'Success'}</td><td>{result.timestamp}</td></tr>})}</tbody></table>{shown.length === 0 && <div className="table-empty">{isActive ? 'Waiting for the first result…' : 'No results match this filter.'}</div>}</div>
      {shown.length > 0 && <footer className="table-pagination"><div className="pagination-summary">Showing <strong>{(pageStart + 1).toLocaleString()}–{Math.min(pageStart + pageSize, shown.length).toLocaleString()}</strong> of <strong>{shown.length.toLocaleString()}</strong></div><label className="page-size">Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label><nav className="pagination-controls" aria-label="Ping results pagination"><button className="icon-button" disabled={activePage === 1} onClick={() => setPage(activePage - 1)} aria-label="Previous results page"><ChevronLeft size={16} /></button><span aria-live="polite">Page <strong>{activePage}</strong> of <strong>{pageCount}</strong></span><button className="icon-button" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)} aria-label="Next results page"><ChevronRight size={16} /></button></nav></footer>}
    </section>
    {!isActive && <section className="completion-grid"><div className="failed-panel"><div><AlertTriangle size={19} /><span><strong>Failed / unreachable devices</strong><small>{failed.length.toLocaleString()} devices</small></span></div>{failed.slice(0, 5).map((result) => <p key={result.device}><span>{result.device}</span><b>{result.error ?? result.status}</b></p>)}{failed.length > 0 && <button className="secondary-button" onClick={() => onRetryFailed(failed)}><RotateCcw size={15} /> Retry failed devices</button>}</div><div className="downloads-panel"><h2>Download report</h2><p>TXT preserves the original report structure. Additional formats are generated from the same completed results.</p><div><a href={reportUrl(jobId, 'txt')}><FileText size={18} /> Text report</a><a href={reportUrl(jobId, 'xlsx')}><FileSpreadsheet size={18} /> Excel workbook</a><a href={reportUrl(jobId, 'json')}><FileJson size={18} /> JSON data</a></div></div></section>}
    {confirmCancelOpen && <Modal title="Cancel ping test?" description={`Stop this running test now? Completed results (${completed.toLocaleString()} of ${total.toLocaleString()}) will remain available.`} onClose={() => setConfirmCancelOpen(false)}><div className="confirmation-card"><AlertTriangle size={22} /><p>Please confirm before cancelling the active test.</p></div><footer className="modal-actions"><button className="secondary-button" onClick={() => setConfirmCancelOpen(false)}>No, continue test</button><button className="danger-confirm-button" onClick={() => { setConfirmCancelOpen(false); onCancel() }}>Yes, cancel test</button></footer></Modal>}
  </div>
}