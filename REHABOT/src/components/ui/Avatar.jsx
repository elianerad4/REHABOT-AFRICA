const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base'
}

export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={`${SIZES[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${SIZES[size]} rounded-full bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}
