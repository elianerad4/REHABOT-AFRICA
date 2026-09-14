export default function Logo({ size = 'md', mono = false }) {
  const sizes = {
    sm: { box: 28, font: 11, text: 'text-sm' },
    md: { box: 36, font: 14, text: 'text-base' },
    lg: { box: 48, font: 18, text: 'text-xl' }
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s.box} height={s.box} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#0F766E" />
        <polyline
          points="6,24 14,24 18,14 22,34 26,20 30,28 34,24 42,24"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <div>
        <div className={`font-display font-bold leading-none ${s.text} ${mono ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
          Rehabot
        </div>
        <div
          className={`font-display font-semibold leading-none mt-0.5 ${mono ? 'text-primary-200' : 'text-primary-600 dark:text-primary-400'}`}
          style={{ fontSize: s.font - 2 }}
        >
          Africa
        </div>
      </div>
    </div>
  )
}
