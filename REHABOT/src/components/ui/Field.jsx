let uid = 0
export function useFieldId(id) {
  if (id) return id
  uid += 1
  return `field-${uid}`
}

export default function Field({ label, htmlFor, required, hint, error, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>
      ) : null}
    </div>
  )
}
