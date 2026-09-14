export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div role="tablist" className={`inline-flex items-center gap-1 bg-neutral-100 dark:bg-white/5 rounded-lg p-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = active === tab.value
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${
              isActive
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-surface-dark-overlay dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
