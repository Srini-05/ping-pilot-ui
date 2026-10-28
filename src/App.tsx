import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Network, ShieldCheck } from 'lucide-react'
import { AppShell } from './components/AppShell'
import { ConfigureStage } from './components/ConfigureStage'
import { HistoryStage } from './components/HistoryStage'
import { InputStage } from './components/InputStage'
import { ResultsStage } from './components/ResultsStage'
import { ReviewStage } from './components/ReviewStage'
import { cancelPingTest, getErrorMessage, getServerConfiguration, getTestHistory, startPingTest, subscribeToTest } from './services/api'
import type { AppView, DeviceTarget, JobSnapshot, PingConfiguration, PingResult, ServerConfiguration, TestHistoryItem } from './types/ping'
import { markDuplicates, parseDeviceText } from './utils/devices'

const defaultPingConfig: PingConfiguration = { packets: 3, timeout: 5, concurrency: 20, high_latency_ms: 100 }

function App() {
  const [view, setView] = useState<AppView>('dashboard')
  const [dark, setDark] = useState(localStorage.getItem('bulk-ping-theme') === 'dark')
  const [devices, setDevicesState] = useState<DeviceTarget[]>([])
  const [config, setConfig] = useState<PingConfiguration>(defaultPingConfig)
  const [serverConfig, setServerConfig] = useState<ServerConfiguration | null>(null)
  const [history, setHistory] = useState<TestHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [jobId, setJobId] = useState('')
  const [snapshot, setSnapshot] = useState<JobSnapshot | null>(null)
  const [results, setResults] = useState<PingResult[]>([])
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [streamError, setStreamError] = useState('')
  const unsubscribeRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('bulk-ping-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    getServerConfiguration().then(setServerConfig).catch(() => setServerConfig(null))
    getTestHistory().then(setHistory).catch((caught) => setHistoryError(getErrorMessage(caught, 'Unable to retrieve recent tests.'))).finally(() => setHistoryLoading(false))
    return () => unsubscribeRef.current?.()
  }, [])

  function setDevices(next: DeviceTarget[]) { setDevicesState(markDuplicates(next)) }
  function addDevices(next: DeviceTarget[]) { setDevicesState((current) => markDuplicates([...current, ...next])) }

  async function refreshHistory() {
    setHistoryLoading(true)
    try { setHistory(await getTestHistory()); setHistoryError('') }
    catch (caught) { setHistoryError(getErrorMessage(caught, 'Unable to retrieve recent tests.')) }
    finally { setHistoryLoading(false) }
  }

  function connectToJob(id: string) {
    unsubscribeRef.current?.()
    unsubscribeRef.current = subscribeToTest(id, {
      snapshot: (next) => { setSnapshot(next); setResults(next.results) },
      result: (payload) => {
        setResults((current) => [...current, payload.result])
        setSnapshot((current) => current ? { ...current, completed: payload.completed, total: payload.total } : current)
      },
      finished: (finalSnapshot) => { setSnapshot(finalSnapshot); setResults(finalSnapshot.results); void refreshHistory(); setStreamError('') },
      error: () => setStreamError('Live connection interrupted. Completed results remain on the server.'),
    })
  }

  async function startTest() {
    const targets = devices.filter((device) => device.status === 'valid' || device.status === 'warning').map((device) => device.value)
    setStarting(true); setStartError(''); setResults([]); setSnapshot(null)
    try {
      const job = await startPingTest(targets, config)
      setJobId(job.id)
      setView('running')
      connectToJob(job.id)
    } catch (caught) {
      setStartError(getErrorMessage(caught, 'Unable to start the ping test. Please try again.'))
    } finally { setStarting(false) }
  }

  async function cancelTest() {
    try { await cancelPingTest(jobId) }
    catch (caught) { setStreamError(getErrorMessage(caught, 'Unable to cancel the ping test. Please try again.')) }
  }

  function retryFailed(failed: PingResult[]) {
    setDevices(markDuplicates(failed.flatMap((result) => parseDeviceText(result.device, 'Retry from failed results'))))
    setSnapshot(null); setResults([]); setJobId(''); setView('configure')
  }

  function newTest() { unsubscribeRef.current?.(); setDevices([]); setSnapshot(null); setResults([]); setJobId(''); setView('dashboard') }

  function resetUploadedCollection() {
    unsubscribeRef.current?.()
    setDevices([])
    setSnapshot(null)
    setResults([])
    setJobId('')
    setStartError('')
    setStreamError('')
    setView('dashboard')
  }

  function navigate(next: AppView) {
    if (next === 'review' && devices.length === 0) setView('dashboard')
    else { setView(next); if (next === 'history') void refreshHistory() }
  }

  return <AppShell view={view} dark={dark} connected={Boolean(serverConfig)} onNavigate={navigate} onToggleTheme={() => setDark((value) => !value)}>
    {view === 'dashboard' && <InputStage devices={devices} history={history} historyRetentionDays={serverConfig?.history_retention_days ?? 5} connected={Boolean(serverConfig)} onAdd={addDevices} onReview={() => setView('review')} onClear={resetUploadedCollection} />}
    {view === 'review' && <ReviewStage devices={devices} onBack={() => setView('dashboard')} onChange={setDevices} onContinue={() => setView('configure')} />}
    {view === 'configure' && <ConfigureStage targetCount={devices.filter((device) => device.status === 'valid' || device.status === 'warning').length} config={config} serverConfig={serverConfig} busy={starting} error={startError} onChange={setConfig} onBack={() => setView('review')} onStart={() => void startTest()} onReset={resetUploadedCollection} />}
    {view === 'running' && <ResultsStage jobId={jobId} snapshot={snapshot} results={results} config={config} streamError={streamError} onCancel={() => void cancelTest()} onRetryFailed={retryFailed} onNew={newTest} />}
    {view === 'history' && <HistoryStage history={history} loading={historyLoading} error={historyError} retentionDays={serverConfig?.history_retention_days ?? 5} />}
    {view === 'settings' && <div className="page simple-page"><div className="page-title"><div><span className="eyebrow">Service policy</span><h1>Settings & capabilities</h1><p>Administrator-controlled limits and verified backend features.</p></div></div><div className="settings-grid"><section><Network size={20} /><h2>Execution</h2><dl><div><dt>Large test warning</dt><dd>{serverConfig?.large_test_threshold.toLocaleString() ?? 'Unavailable'} targets</dd></div><div><dt>Maximum upload</dt><dd>{serverConfig ? `${Math.round(serverConfig.max_upload_bytes / 1024 / 1024)} MB` : 'Unavailable'}</dd></div><div><dt>History retention</dt><dd>{serverConfig?.history_retention_days ?? 5} days</dd></div><div><dt>State storage</dt><dd>{serverConfig?.state_storage ?? 'Unavailable'}</dd></div></dl></section><section><ShieldCheck size={20} /><h2>Existing script</h2><dl><div><dt>Packets / timeout</dt><dd>Supported</dd></div><div><dt>Parallel workers</dt><dd>Supported</dd></div><div><dt>Pause / retry</dt><dd>Not supported</dd></div><div><dt>Safe cancellation</dt><dd>API extension</dd></div></dl></section></div><div className="alert neutral"><AlertCircle size={18} /><span>Authentication must be provided by the internal deployment layer before exposing this service beyond a trusted development environment.</span></div></div>}
  </AppShell>
}

export default App