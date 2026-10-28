import { Check } from 'lucide-react'

export function WorkflowSteps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Input', 'Review & configure', 'Ping test']
  return (
    <ol className="workflow-steps" aria-label="Ping test progress">
      {steps.map((step, index) => {
        const number = index + 1
        return <li key={step} className={number === current ? 'current' : number < current ? 'done' : ''}><span>{number < current ? <Check size={13} /> : number}</span><b>{step}</b></li>
      })}
    </ol>
  )
}