const VARIANTS = {
  ghost: 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200',
  subtle: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10',
  danger: 'text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10'
}

const SIZES = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-lg',
  lg: 'w-11 h-11 rounded-xl'
}

export default function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
    </button>
  )
}
