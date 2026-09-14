import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info }
const TONE = {
  success: 'text-success-600 dark:text-green-400',
  warning: 'text-warning-600 dark:text-amber-400',
  danger: 'text-danger-600 dark:text-red-400',
  info: 'text-info-600 dark:text-sky-400'
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, variant: options.variant ?? 'info', description: options.description }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => dismiss(id), options.duration ?? 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 w-full max-w-sm">
          <AnimatePresence>
            {toasts.map((t) => {
              const Icon = ICONS[t.variant]
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="bg-white dark:bg-surface-dark-raised border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-popover p-4 flex items-start gap-3"
                  role="status"
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${TONE[t.variant]}`} strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{t.message}</p>
                    {t.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t.description}</p>}
                  </div>
                  <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
