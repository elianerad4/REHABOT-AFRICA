import { useNavigate } from 'react-router-dom'
import { Moon, Sun, ShieldCheck, Settings as SettingsIcon, LogOut, ArrowLeft } from 'lucide-react'
import Logo from '../ui/Logo'
import IconButton from '../ui/IconButton'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'

export default function TopBar({ context, isAdmin = false, back, actions }) {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div className="px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {back && (
            <IconButton icon={ArrowLeft} label="Back" size="sm" onClick={back} />
          )}
          <button onClick={() => navigate('/dashboard')} className="flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 rounded-md">
            <Logo size="sm" />
          </button>
          {context && (
            <span className="text-sm text-neutral-400 dark:text-neutral-500 border-l border-neutral-200 dark:border-neutral-700 pl-3 hidden sm:block truncate">
              {context}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {actions}
          <IconButton
            icon={darkMode ? Sun : Moon}
            label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            size="sm"
            onClick={toggleDarkMode}
          />
          {isAdmin && (
            <IconButton icon={ShieldCheck} label="Admin" size="sm" onClick={() => navigate('/admin')} />
          )}
          <IconButton icon={SettingsIcon} label="Settings" size="sm" onClick={() => navigate('/settings')} />
          <IconButton icon={LogOut} label="Log out" size="sm" variant="danger" onClick={handleLogout} />
        </div>
      </div>
    </header>
  )
}
