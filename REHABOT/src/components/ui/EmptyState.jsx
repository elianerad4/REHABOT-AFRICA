export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`text-center py-14 px-6 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-neutral-400 dark:text-neutral-500" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
