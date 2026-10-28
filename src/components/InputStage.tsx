import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ClipboardPaste, FileSpreadsheet, FileText, Trash2, UploadCloud } from 'lucide-react'
import type { DeviceTarget, ImportResponse, ImportSheet, TestHistoryItem } from '../types/ping'
import { getErrorMessage, importDeviceFile } from '../services/api'
import { deviceCounts, parseDeviceText, recommendedColumn } from '../utils/devices'
import { ErrorBanner } from './ErrorBanner'
import { Modal } from './Modal'
import { ProcessingOverlay } from './ProcessingOverlay'
import { WorkflowSteps } from './WorkflowSteps'

interface InputStageProps {
  devices: DeviceTarget[]
  history: TestHistoryItem[]
  historyRetentionDays: number
  connected: boolean
  onAdd: (devices: DeviceTarget[]) => void
  onReview: () => void
  onClear: () => void
}

interface TableSelection { fileName: string; sheets: ImportSheet[] }

export function InputStage({ devices, history, historyRetentionDays, connected, onAdd, onReview, onClear }: InputStageProps) {
  const [pasteOpen, setPasteOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingFile, setProcessingFile] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tableSelection, setTableSelection] = useState<TableSelection | null>(null)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [columnIndex, setColumnIndex] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const detected = deviceCounts(parseDeviceText(paste, 'Pasted text'))

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  async function handleFile(file?: File) {
    if (!file) return
    setError(''); setNotice(''); setProcessingFile(file.name); setLoading(true)
    try {
      const response: ImportResponse = await importDeviceFile(file)
      if (response.kind === 'text') {
        const extracted = parseDeviceText(response.text, `${file.name} → extracted text`)
        onAdd(extracted)
        setNotice(`${extracted.length.toLocaleString()} possible devices added for review.`)
      } else {
        setTableSelection({ fileName: file.name, sheets: response.sheets })
        setSheetIndex(0)
        setColumnIndex(recommendedColumn(response.sheets[0]?.columns ?? []))
      }
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to import the file. Check the file and try again.'))
    } finally { setLoading(false); setProcessingFile('') }
  }

  function importColumn() {
    if (!tableSelection) return
    const sheet = tableSelection.sheets[sheetIndex]
    const column = sheet.columns[columnIndex] || `Column ${columnIndex + 1}`
    const values = sheet.rows.map((row) => row[columnIndex]).filter(Boolean).join('\n')
    const imported = parseDeviceText(values, `${tableSelection.fileName} → ${sheet.name} → ${column}`)
    onAdd(imported)
    setNotice(`${imported.length.toLocaleString()} rows added for review.`)
    setTableSelection(null)
  }

  return (
    <div className="page input-page">
      <WorkflowSteps current={1} />
      <div className="page-title"><div><span className="eyebrow">New operation</span><h1>PingPilot</h1><p>Import your device list, review every target, then run a controlled connectivity test.</p></div></div>
      {notice && <div className="success-banner top-banner" role="status" aria-live="polite"><span>{notice}</span><i className="success-banner-progress" /></div>}
      {!connected && <ErrorBanner title="Ping service unavailable" message="Start the FastAPI backend to upload files or execute tests. Paste and review remain available." />}
      <section className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]) }}>
        <div className="upload-icon"><UploadCloud size={27} /></div>
        <h2>{loading ? 'Reading file…' : 'Drop your device file here'}</h2>
        <p>or choose a file from your computer</p>
        <button className="secondary-button" disabled={!connected || loading} onClick={() => fileInput.current?.click()}><FileSpreadsheet size={16} /> Browse files</button>
        <input ref={fileInput} hidden type="file" accept=".csv,.xlsx,.xls,.txt,.doc,.docx" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <div className="file-types"><span>CSV</span><span>XLSX / XLS</span><span>TXT</span><span>DOC / DOCX</span><small>Files are validated and limited by the server policy.</small></div>
      </section>
      <div className="or-divider"><span>or</span></div>
      <button className="paste-card" onClick={() => setPasteOpen(true)}><span><ClipboardPaste size={21} /></span><div><strong>Paste device list</strong><small>IP addresses and hostnames separated by lines, commas, spaces, tabs, or semicolons</small></div><ArrowRight size={18} /></button>
      {error && <ErrorBanner title="File import failed" message={error} />}
      {devices.length > 0 && <section className="collection-bar"><div><strong>{devices.length.toLocaleString()} devices in current collection</strong><span>Sources can be mixed. Nothing will be pinged until review and confirmation.</span></div><div className="collection-actions"><button className="text-button" onClick={() => setConfirmClearOpen(true)}><Trash2 size={15} /> Remove uploaded list</button><button className="primary-button" onClick={onReview}>Review devices <ArrowRight size={16} /></button></div></section>}

      <section className="recent-section"><div className="section-title"><div><h2>Recent tests</h2><p>Retained by the ping service for {historyRetentionDays} days</p></div></div>{history.length === 0 ? <div className="empty-row"><FileText size={20} /><span>No retained tests are available.</span></div> : <div className="recent-list">{history.slice(0, 3).map((item) => <div key={item.id}><span>{new Date(item.date).toLocaleString()}</span><strong>{item.total} targets</strong><span>{item.reachable} reachable</span><span>{item.failed} failed</span></div>)}</div>}</section>

      {pasteOpen && <Modal title="Paste your devices" description="Every detected value will be shown on the review screen before execution." onClose={() => setPasteOpen(false)} wide>
        <textarea className="paste-textarea" autoFocus value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={'10.10.10.1\n10.10.10.2, server01.company.com\nweb01'} />
        <div className="modal-counts"><span><b>{detected.total}</b> detected</span><span><b>{detected.valid}</b> possible targets</span><span><b>{detected.invalid}</b> invalid</span></div>
        <footer className="modal-actions"><button className="text-button" onClick={() => setPaste('')}>Clear</button><button className="primary-button" disabled={!detected.total} onClick={() => { onAdd(parseDeviceText(paste, 'Pasted text')); setPaste(''); setPasteOpen(false); onReview() }}>Review devices <ArrowRight size={16} /></button></footer>
      </Modal>}

      {tableSelection && <Modal title="Select device column" description="Choose the worksheet and column containing targets. A preview is shown before import." onClose={() => setTableSelection(null)} wide>
        <div className="selector-grid"><label>Sheet<select value={sheetIndex} onChange={(event) => { const next = Number(event.target.value); setSheetIndex(next); setColumnIndex(recommendedColumn(tableSelection.sheets[next].columns)) }}>{tableSelection.sheets.map((sheet, index) => <option key={sheet.name} value={index}>{sheet.name}</option>)}</select></label><label>Device column<select value={columnIndex} onChange={(event) => setColumnIndex(Number(event.target.value))}>{tableSelection.sheets[sheetIndex].columns.map((column, index) => <option key={`${column}-${index}`} value={index}>{column || `Column ${index + 1}`}</option>)}</select></label></div>
        <div className="import-summary"><span>Detected rows <b>{tableSelection.sheets[sheetIndex].rows.length.toLocaleString()}</b></span><span>Selected column <b>{tableSelection.sheets[sheetIndex].columns[columnIndex] || `Column ${columnIndex + 1}`}</b></span></div>
        <div className="preview-table">{tableSelection.sheets[sheetIndex].rows.slice(0, 6).map((row, index) => <div key={index}><span>{index + 1}</span><strong>{row[columnIndex] || '—'}</strong></div>)}</div>
        <footer className="modal-actions"><button className="secondary-button" onClick={() => setTableSelection(null)}>Cancel</button><button className="primary-button" onClick={importColumn}>Add to review <ArrowRight size={16} /></button></footer>
      </Modal>}
      {confirmClearOpen && <Modal title="Remove uploaded list?" description="This clears all currently loaded targets so you can upload a new file." onClose={() => setConfirmClearOpen(false)}><div className="confirmation-card"><Trash2 size={22} /><p>Please confirm before removing the current uploaded target list.</p></div><footer className="modal-actions"><button className="secondary-button" onClick={() => setConfirmClearOpen(false)}>Cancel</button><button className="danger-confirm-button" onClick={() => { setConfirmClearOpen(false); setNotice(''); setError(''); onClear() }}>Yes, remove list</button></footer></Modal>}
      {loading && <ProcessingOverlay title={`Processing ${processingFile}`} message="The backend is validating the file and extracting possible device addresses for your review." />}
    </div>
  )
}