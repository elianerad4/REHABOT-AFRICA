export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { box: 28, font: 11, text: 'text-sm' },
    md: { box: 36, font: 14, text: 'text-base' },
    lg: { box: 48, font: 18, text: 'text-xl' }
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      {/* Icon */}
      <svg
        width={s.box}
        height={s.box}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="10" fill="#16a34a"/>
        {/* Heart pulse line */}
        <polyline
          points="6,24 14,24 18,14 22,34 26,20 30,28 34,24 42,24"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {/* Text */}
      <div>
        <div className={`font-bold text-gray-900 leading-none ${s.text}`}>
          Rehabot
        </div>
        <div className="text-green-600 font-semibold leading-none"
             style={{ fontSize: s.font - 2 }}>
          Africa
        </div>
      </div>
    </div>
  )
}