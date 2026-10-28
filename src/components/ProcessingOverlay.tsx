import { LoaderCircle, ServerCog } from 'lucide-react'

interface ProcessingOverlayProps {
  title: string
  message: string
}

export function ProcessingOverlay({ title, message }: ProcessingOverlayProps) {
  return (
    <div className="processing-backdrop" role="status" aria-live="assertive" aria-busy="true">
      <section className="processing-card">
        <div className="processing-icon">
          <LoaderCircle className="processing-spinner" size={28} />
          <ServerCog size={18} />
        </div>
        <div>
          <span>Backend processing</span>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="processing-bar"><i /></div>
        <small>Please keep this page open.</small>
      </section>
    </div>
  )
}