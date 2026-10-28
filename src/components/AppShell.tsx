import type { ReactNode } from 'react'
import { Activity, Clock3, History, ListChecks, Moon, Network, Plus, Settings, Sun } from 'lucide-react'
import type { AppView } from '../types/ping'

interface AppShellProps {
  view: AppView
  dark: boolean
  connected: boolean
  children: ReactNode
  onNavigate: (view: AppView) => void
  onToggleTheme: () => void
}

const navigation = [
  { view: 'dashboard' as const, label: 'Dashboard', icon: Activity },
  { view: 'review' as const, label: 'New ping test', icon: Plus },
  { view: 'history' as const, label: 'Test history', icon: History },
  { view: 'settings' as const, label: 'Settings', icon: Settings },
]

export function AppShell({ view, dark, connected, children, onNavigate, onToggleTheme }: AppShellProps) {
  const workflowViews: AppView[] = ['review', 'configure', 'running']
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate('dashboard')}><span><Network size={19} /></span><b>PingPilot</b></button>
        <nav aria-label="Primary navigation">
          {navigation.map(({ view: itemView, label, icon: Icon }) => (
            <button key={itemView} className={`nav-item ${(itemView === view || (itemView === 'review' && workflowViews.includes(view))) ? 'active' : ''}`} onClick={() => onNavigate(itemView)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`connection ${connected ? 'online' : 'offline'}`}><i /> <span>{connected ? 'Ping service online' : 'Service unavailable'}</span></div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="mobile-title"><Network size={19} /><strong>PingPilot</strong></div>
          <div className="topbar-context"><ListChecks size={16} /><span>Network Connectivity Validation</span></div>
          <div className="topbar-actions"><span className="clock"><Clock3 size={14} /> Retained history</span><button className="icon-button" onClick={onToggleTheme} aria-label={dark ? 'Use light mode' : 'Use dark mode'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button></div>
        </header>
        {children}
        <footer className="app-footer">Made by Srinivasan</footer>
      </main>
    </div>
  )
}