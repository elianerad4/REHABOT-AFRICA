export default function Card({ as: As = 'div', padding = 'md', className = '', children, ...props }) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : 'p-6'
  return (
    <As
      className={`bg-white border border-neutral-200 rounded-xl shadow-card dark:bg-surface-dark-raised dark:border-neutral-800 ${pad} ${className}`}
      {...props}
    >
      {children}
    </As>
  )
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
        {description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}
