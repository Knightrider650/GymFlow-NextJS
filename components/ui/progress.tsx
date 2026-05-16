import React from 'react'

type ProgressProps = {
  value?: number
  max?: number
  className?: string
}

export const Progress: React.FC<ProgressProps> = ({ value = 0, max = 100, className }) => {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className || ''}`}>
      <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default Progress
