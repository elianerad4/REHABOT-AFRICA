export default function PageHeader({ title, description, action, breadcrumb, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 flex-wrap mb-8 ${className}`}>
      <div>
        {breadcrumb && <div className="mb-1.5">{breadcrumb}</div>}
        <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">{title}</h1>
        {description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  )
}
