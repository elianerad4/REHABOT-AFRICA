import { forwardRef } from 'react'
import Field, { useFieldId } from './Field'

const baseCls =
  'w-full h-10 px-3.5 text-sm rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed dark:bg-surface-dark-raised dark:text-white dark:placeholder:text-neutral-500 dark:disabled:bg-white/5'

const Input = forwardRef(function Input(
  { label, hint, error, required, id, className = '', icon: Icon, ...props },
  ref
) {
  const fieldId = useFieldId(id)
  return (
    <Field label={label} htmlFor={fieldId} required={required} hint={hint} error={error}>
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          className={`${baseCls} ${Icon ? 'pl-9' : ''} ${error ? 'border-danger-400 focus:ring-danger-500/20 focus:border-danger-500' : 'border-neutral-300 dark:border-neutral-700'} ${className}`}
          {...props}
        />
      </div>
    </Field>
  )
})

export default Input
