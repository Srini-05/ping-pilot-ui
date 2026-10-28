import { useState } from 'react'
import { ArrowLeft, Play, RotateCcw, ShieldAlert } from 'lucide-react'
import type { PingConfiguration, ServerConfiguration } from '../types/ping'
import { ErrorBanner } from './ErrorBanner'
import { Modal } from './Modal'
import { ProcessingOverlay } from './ProcessingOverlay'
import { WorkflowSteps } from './WorkflowSteps'

interface ConfigureStageProps {
  targetCount: number
  config: PingConfiguration
  serverConfig: ServerConfiguration | null
  busy: boolean
  error: string
  onChange: (config: PingConfiguration) => void
  onBack: () => void
  onStart: () => void
  onReset: () => void
}

export function ConfigureStage({ targetCount, config, serverConfig, busy, error, onChange, onBack, onStart, onReset }: ConfigureStageProps) {
  const large = targetCount > (serverConfig?.large_test_threshold ?? Number.POSITIVE_INFINITY)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [confirmStartOpen, setConfirmStartOpen] = useState(false)
  const canStart = !busy && Boolean(serverConfig) && !(large && !acknowledged)
  const fields: { key: keyof PingConfiguration; label: string; help: string; min: number; max: number }[] = [
    { key: 'packets', label: 'Packets per device', help: 'ICMP echo requests sent to each target', min: 1, max: 20 },
    { key: 'timeout', label: 'Timeout', help: 'Maximum response time in seconds', min: 1, max: 60 },
    { key: 'concurrency', label: 'Concurrent devices', help: 'Targets tested in parallel', min: 1, max: 200 },
    { key: 'high_latency_ms', label: 'High latency threshold', help: 'Marks reachable results for attention', min: 1, max: 60000 },
  ]
  return <div className="page configure-page"><WorkflowSteps current={2} /><div className="page-title"><div><span className="eyebrow">Execution settings</span><h1>Configure ping test</h1><p>These controls map directly to the verified capabilities of bulk_ping.py.</p></div></div>
    <div className="configure-layout"><section className="config-panel"><header><h2>Ping configuration</h2><span>Server validated</span></header>{fields.map((field) => <label className="config-field" key={field.key}><div><strong>{field.label}</strong><small>{field.help}</small></div><div className="number-input"><input type="number" min={field.min} max={field.max} value={config[field.key]} onChange={(event) => onChange({ ...config, [field.key]: Number(event.target.value) })} /><span>{field.key === 'timeout' ? 'sec' : field.key === 'high_latency_ms' ? 'ms' : ''}</span></div></label>)}<div className="capability-note"><ShieldAlert size={17} /><p><strong>Pause, retry, batch delay, and IP version selection are hidden.</strong> The existing script does not support them. Safe cancellation is available while a test runs.</p></div></section>
      <aside className="ready-panel"><span className="eyebrow">Ready to start</span><h2>{targetCount.toLocaleString()} targets</h2><dl><div><dt>Packets</dt><dd>{config.packets} / device</dd></div><div><dt>Timeout</dt><dd>{config.timeout} seconds</dd></div><div><dt>Concurrency</dt><dd>{config.concurrency}</dd></div><div><dt>Maximum requests</dt><dd>{(targetCount * config.packets).toLocaleString()}</dd></div></dl>{large && <label className="large-warning"><ShieldAlert size={18} /><span><strong>Large ping test</strong>This exceeds the administrator threshold of {serverConfig?.large_test_threshold.toLocaleString()} targets and may generate significant network traffic.</span><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} aria-label="Acknowledge large test warning" /></label>}{error && <ErrorBanner title="Unable to start test" message={error} />}<button className="primary-button start-button" disabled={!canStart} onClick={() => setConfirmStartOpen(true)}><Play size={17} fill="currentColor" /> {busy ? 'Starting…' : 'Start ping test'}</button><button className="text-button back-button" onClick={onBack}><ArrowLeft size={15} /> Back to review</button><button className="text-button back-button danger-text" onClick={() => setConfirmResetOpen(true)}><RotateCcw size={15} /> Remove uploaded list and upload new</button></aside>
    </div>
    {busy && <ProcessingOverlay title="Preparing ping test" message={`The backend is validating ${targetCount.toLocaleString()} targets and creating the live test session.`} />}
    {confirmStartOpen && <Modal title="Start ping test?" description={`Run the test now for ${targetCount.toLocaleString()} targets with ${config.concurrency} concurrent pings?`} onClose={() => setConfirmStartOpen(false)}><div className="confirmation-card"><Play size={22} /><p>Please confirm to start the ping test.</p></div><footer className="modal-actions"><button className="secondary-button" onClick={() => setConfirmStartOpen(false)}>Cancel</button><button className="primary-button" onClick={() => { setConfirmStartOpen(false); onStart() }}>Yes, start test</button></footer></Modal>}
    {confirmResetOpen && <Modal title="Remove uploaded list?" description="This clears the current target collection and returns you to upload a new file." onClose={() => setConfirmResetOpen(false)}><div className="confirmation-card"><ShieldAlert size={22} /><p>Please confirm before removing all uploaded targets.</p></div><footer className="modal-actions"><button className="secondary-button" onClick={() => setConfirmResetOpen(false)}>Cancel</button><button className="danger-confirm-button" onClick={() => { setConfirmResetOpen(false); onReset() }}>Yes, remove and upload new</button></footer></Modal>}
  </div>
}