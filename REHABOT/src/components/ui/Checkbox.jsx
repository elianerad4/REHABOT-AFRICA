import { forwardRef } from 'react'
import { useFieldId } from './Field'

const Checkbox = forwardRef(function Checkbox({ label, id, className = '', ...props }, ref) {
  const fieldId = useFieldId(id)
  return (
    <label htmlFor={fieldId} className={`flex items-start gap-2.5 cursor-pointer select-none ${className}`}>
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:border-neutral-600 dark:bg-surface-dark-raised"
        {...props}
      />
      {label && <span className="text-sm text-neutral-600 dark:text-neutral-300 leading-snug">{label}</span>}
    </label>
  )
})

export default Checkbox
