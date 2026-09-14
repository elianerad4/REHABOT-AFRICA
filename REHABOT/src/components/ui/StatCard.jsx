export default function StatCard({ label, value, icon: Icon, tone = 'neutral', hint }) {
  const toneCls = {
    neutral: 'text-neutral-900 dark:text-white',
    primary: 'text-primary-600 dark:text-primary-400',
    success: 'text-success-600 dark:text-green-400',
    warning: 'text-warning-600 dark:text-amber-400',
    danger: 'text-danger-600 dark:text-red-400'
  }[tone]

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-card p-5 dark:bg-surface-dark-raised dark:border-neutral-800">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-neutral-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
            <Icon className={`w-4 h-4 ${toneCls}`} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className={`text-3xl font-display font-bold mt-2 ${toneCls}`}>{value}</div>
      {hint && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{hint}</p>}
    </div>
  )
}
