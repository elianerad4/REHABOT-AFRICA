import { forwardRef } from 'react'
import Field, { useFieldId } from './Field'

const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, id, rows = 3, className = '', ...props },
  ref
) {
  const fieldId = useFieldId(id)
  return (
    <Field label={label} htmlFor={fieldId} required={required} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={!!error}
        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400 dark:bg-surface-dark-raised dark:text-white dark:placeholder:text-neutral-500 ${error ? 'border-danger-400' : 'border-neutral-300 dark:border-neutral-700'} ${className}`}
        {...props}
      />
    </Field>
  )
})

export default Textarea
