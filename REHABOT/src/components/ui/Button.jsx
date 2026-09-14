const VARIANTS = {
  primary:
    'bg-primary-600 text-white shadow-xs hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300 dark:disabled:bg-primary-900',
  secondary:
    'bg-white text-neutral-700 border border-neutral-300 shadow-xs hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-400 disabled:bg-neutral-50 dark:bg-surface-dark-raised dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-surface-dark-overlay',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-300 dark:text-neutral-300 dark:hover:bg-white/5',
  danger:
    'bg-danger-500 text-white shadow-xs hover:bg-danger-600 active:bg-red-800 disabled:bg-red-300',
  'danger-ghost':
    'text-danger-500 hover:bg-danger-50 active:bg-red-100 disabled:text-red-300 dark:hover:bg-danger-500/10'
}

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl'
}

export default function Button({
  as: As = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <As
      disabled={As === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" strokeWidth={2} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" strokeWidth={2} />}
        </>
      )}
    </As>
  )
}
