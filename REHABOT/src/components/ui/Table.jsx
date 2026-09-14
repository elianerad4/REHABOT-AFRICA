export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`}>{children}</table>
    </div>
  )
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-white/[0.02]">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide px-6 py-3 ${className}`}>
      {children}
    </th>
  )
}

export function Tr({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 ${onClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors duration-150' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className = '' }) {
  return <td className={`px-6 py-4 text-neutral-700 dark:text-neutral-300 ${className}`}>{children}</td>
}
