const VARIANTS = {
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-green-300',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-amber-300',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-red-300',
  info: 'bg-info-50 text-info-600 dark:bg-info-500/10 dark:text-sky-300'
}

export default function Badge({ variant = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${VARIANTS[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
