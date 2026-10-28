import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CopyX, Plus, Search, Trash2, TriangleAlert, XCircle } from 'lucide-react'
import type { DeviceStatus, DeviceTarget } from '../types/ping'
import { classifyDevice, deviceCounts, parseDeviceText } from '../utils/devices'
import { Modal } from './Modal'
import { WorkflowSteps } from './WorkflowSteps'

interface ReviewStageProps {
  devices: DeviceTarget[]
  onBack: () => void
  onChange: (devices: DeviceTarget[]) => void
  onContinue: () => void
}

interface Confirmation {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  action: () => void
}

export function ReviewStage({ devices, onBack, onChange, onContinue }: ReviewStageProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | DeviceStatus>('all')
    const [sortDirection, setSortDirection] = useState<'none' | 'asc' | 'desc'>('none')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(devices.map((device) => device.id)))
  const [addOpen, setAddOpen] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const counts = deviceCounts(devices)
  const shown = useMemo(() => {
      const filtered = devices.filter((device) => (filter === 'all' || device.status === filter) && device.value.toLowerCase().includes(search.toLowerCase()))
      if (sortDirection === 'none') return filtered
      return [...filtered].sort((a, b) => sortDirection === 'asc' ? a.value.localeCompare(b.value) : b.value.localeCompare(a.value))
    }, [devices, filter, search, sortDirection])
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize))
  const activePage = Math.min(page, pageCount)
  const pageStart = (activePage - 1) * pageSize
  const pageDevices = shown.slice(pageStart, pageStart + pageSize)
  const allPageSelected = pageDevices.length > 0 && pageDevices.every((device) => selected.has(device.id))
  const somePageSelected = pageDevices.some((device) => selected.has(device.id))

  function removeWhere(predicate: (device: DeviceTarget) => boolean) {
    const remaining = devices.filter((device) => !predicate(device))
    onChange(remaining)
    setPage(1)
    setSelected((current) => new Set(remaining.filter((device) => current.has(device.id)).map((device) => device.id)))
  }
  function updateDevice(id: string, value: string) { const classification = classifyDevice(value.trim()); onChange(devices.map((device) => device.id === id ? { ...device, value: value.trim(), ...classification } : device)); setPage(1) }
  function addManualDevices() {
    const added = parseDeviceText(addValue, 'Manual entry')
    onChange([...devices, ...added])
    setSelected((current) => new Set([...current, ...added.map((device) => device.id)]))
    setAddOpen(false)
    setAddValue('')
  }
  function confirmAction(confirmation: Confirmation) { setConfirmation(confirmation) }
  function runConfirmedAction() { confirmation?.action(); setConfirmation(null) }

  return <div className="page table-page">
    <WorkflowSteps current={2} />
    <div className="page-title"><div><span className="eyebrow">Review required</span><h1>Review ping targets</h1><p>Resolve duplicates and invalid entries. Warning entries are valid single-label hostnames and should be confirmed.</p></div><button className="secondary-button" onClick={onBack}><ArrowLeft size={16} /> Add more sources</button></div>
    <div className="summary-grid review-summary">
      <div><span>Total detected</span><strong>{counts.total.toLocaleString()}</strong></div>
      <div className="good"><span>Valid / reviewable</span><strong>{counts.valid.toLocaleString()}</strong></div>
      <div className="warn"><span>Duplicates</span><strong>{counts.duplicates.toLocaleString()}</strong></div>
      <div className="bad"><span>Invalid</span><strong>{counts.invalid.toLocaleString()}</strong></div>
    </div>
    <section className="data-panel">
      <div className="table-tools"><div className="search-box"><Search size={16} /><input aria-label="Search devices" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search device, IP, or hostname" /></div><select aria-label="Filter devices by status" value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setPage(1) }}><option value="all">All statuses</option><option value="valid">Valid</option><option value="warning">Warning</option><option value="duplicate">Duplicate</option><option value="invalid">Invalid</option></select><button className="secondary-button compact" onClick={() => setAddOpen(true)}><Plus size={15} /> Add device</button></div>
      <div className="bulk-tools"><span>{selected.size ? `${selected.size} selected` : `${shown.length.toLocaleString()} rows`}</span>{(search || filter !== 'all') && <button onClick={() => confirmAction({ title: 'Clear filters?', description: 'This will reset the search and status filter so every target is visible again.', confirmLabel: 'Yes, clear filters', action: () => { setSearch(''); setFilter('all'); setPage(1) } })}>Clear filters</button>}{selected.size > 0 && <button onClick={() => confirmAction({ title: 'Remove selected targets?', description: `${selected.size.toLocaleString()} selected targets will be removed from this ping test.`, confirmLabel: 'Yes, remove selected', danger: true, action: () => removeWhere((device) => selected.has(device.id)) })}><Trash2 size={14} /> Remove selected</button>}<button disabled={!counts.duplicates} onClick={() => confirmAction({ title: 'Remove duplicate targets?', description: `${counts.duplicates.toLocaleString()} duplicate entries will be removed. The first occurrence of each target will be kept.`, confirmLabel: 'Yes, keep first', action: () => removeWhere((device) => device.status === 'duplicate') })}><CopyX size={14} /> Keep first duplicate</button><button disabled={!counts.invalid} onClick={() => confirmAction({ title: 'Remove invalid targets?', description: `${counts.invalid.toLocaleString()} invalid entries will be permanently removed from this collection.`, confirmLabel: 'Yes, remove invalid', danger: true, action: () => removeWhere((device) => device.status === 'invalid') })}><XCircle size={14} /> Remove invalid</button><button disabled={!devices.length} onClick={() => confirmAction({ title: 'Clear all targets?', description: `All ${devices.length.toLocaleString()} targets and their source details will be removed.`, confirmLabel: 'Yes, clear all', danger: true, action: () => removeWhere(() => true) })}>Clear all</button></div>
      <div className="table-scroll"><table className="review-table"><thead><tr><th><input type="checkbox" aria-label="Select all devices on this page" ref={(input) => { if (input) input.indeterminate = somePageSelected && !allPageSelected }} checked={allPageSelected} onChange={(event) => { const next = new Set(selected); pageDevices.forEach((device) => event.target.checked ? next.add(device.id) : next.delete(device.id)); setSelected(next) }} /></th><th>#</th><th aria-sort={sortDirection === 'none' ? 'none' : sortDirection === 'asc' ? 'ascending' : 'descending'}><button onClick={() => { setSortDirection((value) => value === 'none' ? 'asc' : value === 'asc' ? 'desc' : 'none'); setPage(1) }}>Device {sortDirection === 'none' ? '↕' : sortDirection === 'asc' ? '↑' : '↓'}</button></th><th>Type</th><th>Status</th><th>Source</th><th aria-label="Actions" /></tr></thead><tbody>{pageDevices.map((device) => <tr key={device.id}><td><input type="checkbox" aria-label={`Select ${device.value}`} checked={selected.has(device.id)} onChange={(event) => { const next = new Set(selected); if (event.target.checked) next.add(device.id); else next.delete(device.id); setSelected(next) }} /></td><td>{devices.indexOf(device) + 1}</td><td><input className="cell-input" value={device.value} onChange={(event) => updateDevice(device.id, event.target.value)} aria-label={`Edit ${device.value}`} /></td><td><span className="type-tag">{device.type}</span></td><td><span className={`status-label ${device.status}`}>{device.status === 'valid' ? <CheckCircle2 size={14} /> : device.status === 'invalid' ? <XCircle size={14} /> : <TriangleAlert size={14} />}{device.status}</span></td><td className="source-cell" title={device.source}>{device.source}</td><td><button className="row-action" onClick={() => confirmAction({ title: `Remove ${device.value}?`, description: 'This target will be removed from the current ping test.', confirmLabel: 'Yes, remove target', danger: true, action: () => removeWhere((item) => item.id === device.id) })} aria-label={`Remove ${device.value}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table>{!shown.length && <div className="table-empty">No devices match this view.</div>}</div>
      {shown.length > 0 && <footer className="table-pagination">
        <div className="pagination-summary">Showing <strong>{(pageStart + 1).toLocaleString()}–{Math.min(pageStart + pageSize, shown.length).toLocaleString()}</strong> of <strong>{shown.length.toLocaleString()}</strong></div>
        <label className="page-size">Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
        <nav className="pagination-controls" aria-label="Device table pagination"><button className="icon-button" disabled={activePage === 1} onClick={() => setPage(activePage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span aria-live="polite">Page <strong>{activePage}</strong> of <strong>{pageCount}</strong></span><button className="icon-button" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)} aria-label="Next page"><ChevronRight size={16} /></button></nav>
      </footer>}
    </section>
    <div className="review-sticky-status">
      {(counts.duplicates > 0 || counts.invalid > 0) && <section className="review-blocker" role="alert">
        <div className="review-blocker-icon"><TriangleAlert size={20} /></div>
        <div className="review-blocker-copy">
          <strong>Resolve list issues to enable Configure ping</strong>
          <p>{counts.duplicates > 0 && `${counts.duplicates.toLocaleString()} duplicate ${counts.duplicates === 1 ? 'entry must' : 'entries must'} be removed.`}{counts.duplicates > 0 && counts.invalid > 0 ? ' ' : ''}{counts.invalid > 0 && `${counts.invalid.toLocaleString()} invalid ${counts.invalid === 1 ? 'entry must' : 'entries must'} be removed or corrected.`}</p>
        </div>
        <div className="review-blocker-actions">
          {counts.duplicates > 0 && <button className="secondary-button compact" onClick={() => confirmAction({ title: 'Remove duplicate targets?', description: `${counts.duplicates.toLocaleString()} duplicate entries will be removed. The first occurrence of each target will be kept.`, confirmLabel: 'Yes, keep first', action: () => removeWhere((device) => device.status === 'duplicate') })}><CopyX size={15} /> Remove duplicates</button>}
          {counts.invalid > 0 && <button className="secondary-button compact danger-text" onClick={() => confirmAction({ title: 'Remove invalid targets?', description: `${counts.invalid.toLocaleString()} invalid entries will be permanently removed from this collection.`, confirmLabel: 'Yes, remove invalid', danger: true, action: () => removeWhere((device) => device.status === 'invalid') })}><XCircle size={15} /> Remove invalid</button>}
        </div>
      </section>}
      <div className="sticky-actions"><div><strong>{counts.valid.toLocaleString()} targets ready</strong><span>Invalid and duplicate values are never sent to the ping service.</span></div><button className="primary-button" disabled={!counts.valid || counts.invalid > 0 || counts.duplicates > 0} onClick={() => confirmAction({ title: 'Configure ping?', description: `Continue with ${counts.valid.toLocaleString()} reviewed targets? You can return to this screen before starting the test.`, confirmLabel: 'Yes, configure ping', action: onContinue })}>Configure ping <ArrowRight size={16} /></button></div>
    </div>
    {addOpen && <Modal title="Add devices" description="Add one or multiple targets to the current collection." onClose={() => setAddOpen(false)}><textarea className="paste-textarea small" value={addValue} onChange={(event) => setAddValue(event.target.value)} placeholder="10.10.10.1 or server01.company.com" /><footer className="modal-actions"><button className="secondary-button" onClick={() => setAddOpen(false)}>Cancel</button><button className="primary-button" disabled={!addValue.trim()} onClick={addManualDevices}>Add devices</button></footer></Modal>}
    {confirmation && <Modal title={confirmation.title} description={confirmation.description} onClose={() => setConfirmation(null)}><div className="confirmation-card"><TriangleAlert size={22} /><p>Please confirm this action before continuing.</p></div><footer className="modal-actions"><button className="secondary-button" onClick={() => setConfirmation(null)}>No, go back</button><button className={confirmation.danger ? 'danger-confirm-button' : 'primary-button'} onClick={runConfirmedAction}>{confirmation.confirmLabel}</button></footer></Modal>}
  </div>
}