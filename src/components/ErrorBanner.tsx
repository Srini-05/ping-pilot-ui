import { AlertTriangle } from 'lucide-react'

interface ErrorBannerProps {
  title: string
  message: string
}

export function ErrorBanner({ title, message }: ErrorBannerProps) {
  return <div className="error-banner" role="alert" aria-live="assertive">
    <span className="error-banner-icon"><AlertTriangle size={20} /></span>
    <div><strong>{title}</strong><p>{message}</p></div>
  </div>
}