import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface ToastMsg {
  id: number
  title: string
  sub?: string
}

type PushToast = (title: string, sub?: string) => void

const ToastContext = createContext<PushToast>(() => {})

export const useToast = (): PushToast => useContext(ToastContext)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<ToastMsg[]>([])
  const [current, setCurrent] = useState<ToastMsg | null>(null)
  const nextId = useRef(1)

  const push = useCallback<PushToast>((title, sub) => {
    setQueue((q) => [...q, { id: nextId.current++, title, sub }])
  }, [])

  useEffect(() => {
    if (current || queue.length === 0) return
    const [head, ...rest] = queue
    setCurrent(head)
    setQueue(rest)
    const timer = setTimeout(() => setCurrent(null), 2400)
    return () => clearTimeout(timer)
  }, [current, queue])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className={`toast${current ? ' show' : ''}`} role="status">
        {current && (
          <>
            <b>{current.title}</b>
            {current.sub && <small>{current.sub}</small>}
          </>
        )}
      </div>
    </ToastContext.Provider>
  )
}
