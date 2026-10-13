import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Dumbbell, CalendarDays, FileBarChart } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/library', label: 'Library', icon: Dumbbell },
  { to: '/programmes', label: 'Programmes', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: FileBarChart }
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 dark:bg-surface-dark-raised/95 backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <span
                className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500 ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.25 : 2} />
                <span>{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
