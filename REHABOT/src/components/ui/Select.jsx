import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import Field, { useFieldId } from './Field'

const Select = forwardRef(function Select(
  { label, hint, error, required, id, className = '', children, ...props },
  ref
) {
  const fieldId = useFieldId(id)
  return (
    <Field label={label} htmlFor={fieldId} required={required} hint={hint} error={error}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          className={`w-full h-10 pl-3.5 pr-9 text-sm rounded-lg border bg-white text-neutral-900 appearance-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400 dark:bg-surface-dark-raised dark:text-white ${error ? 'border-danger-400' : 'border-neutral-300 dark:border-neutral-700'} ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
      </div>
    </Field>
  )
})

export default Select
