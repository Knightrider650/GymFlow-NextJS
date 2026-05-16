import React from 'react'

type SwitchProps = {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export const Switch: React.FC<SwitchProps> = ({ checked = false, onCheckedChange, className, disabled = false }) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange && onCheckedChange(!checked)}
      disabled={disabled}
      className={`inline-flex items-center w-10 h-6 rounded-full p-1 ${checked ? 'bg-primary' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
    >
      <span className={`inline-block w-4 h-4 bg-white rounded-full transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

export default Switch
