import { useEffect, useRef } from 'react'
import { BOSSES, bossDefeated } from '../data/bosses'
import { useStore } from '../store'
import type { Stats } from '../state/types'
import { Hud } from './Hud'
import { TAB_MAP, type TabId } from './tabs'

interface NavProps {
  tab: TabId
  onTab: (t: TabId) => void
  stats: Stats
  order: TabId[]
  onReorder: () => void
}

/** The current fight — first boss not yet defeated at the lowest logged weight. */
const NextBoss = ({ stats }: { stats: Stats }) => {
  const boss = BOSSES.find((b) => !bossDefeated(b, stats.minW))
  if (!boss) return null
  return (
    <div className="card side-boss">
      <div className="sb-eyebrow">Next boss</div>
      <div className="sb-w">{boss.w} kg</div>
      <div className="sb-name">{boss.name}</div>
      <div className="sb-tip">{boss.tip}</div>
    </div>
  )
}

/** A press held still for ~450ms fires onLong; a tap or a drag (scroll) does
 *  not. `fired` lets the click handler swallow the tap that follows a hold. */
const useLongPress = (onLong: () => void, ms = 450) => {
  const timer = useRef<number | null>(null)
  const fired = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)

  const clear = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      clear()
      timer.current = window.setTimeout(() => {
        fired.current = true
        onLong()
      }, ms)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }

  return { fired, handlers }
}

/** Bottom tab bar — mobile only (hidden on desktop via CSS). Shows four tabs at
 *  a time and scrolls horizontally for the rest; long-press any tab to reorder. */
export const TabBar = ({ tab, onTab, order, onReorder }: Pick<NavProps, 'tab' | 'onTab' | 'order' | 'onReorder'>) => {
  const barRef = useRef<HTMLDivElement>(null)
  const { fired, handlers } = useLongPress(onReorder)

  useEffect(() => {
    const active = barRef.current?.querySelector('.tab-btn.on') as HTMLElement | null
    active?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab, order])

  return (
    <nav className="tabbar" aria-label="Sections">
      <div className="tabs" ref={barRef}>
        {order.map((id) => {
          const t = TAB_MAP[id]
          return (
            <button
              key={id}
              className={`tab-btn${tab === id ? ' on' : ''}`}
              {...handlers}
              onClick={() => {
                if (fired.current) {
                  fired.current = false
                  return
                }
                onTab(id)
              }}
            >
              <span className="t-ico">
                <t.Icon />
              </span>
              <span className="t-lbl">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Sidebar — desktop only (hidden on mobile via CSS). */
export const Sidebar = ({ tab, onTab, stats, order, onReorder }: NavProps) => {
  const { user, mode, signOut } = useStore()
  return (
    <aside className="sidebar">
      <div className="side-logo">
        QUESTLOG <span className="side-sub">150 → 90</span>
      </div>
      <Hud stats={stats} />
      <nav className="side-nav" aria-label="Sections">
        {order.map((id) => {
          const t = TAB_MAP[id]
          return (
            <button
              key={id}
              className={`side-btn${tab === id ? ' on' : ''}`}
              onClick={() => onTab(id)}
            >
              <span className="t-ico">
                <t.Icon />
              </span>{' '}
              {t.label}
            </button>
          )
        })}
      </nav>
      <div className="side-foot">
        <NextBoss stats={stats} />
        <button className="side-reorder" onClick={onReorder}>
          ⇅ Reorder tabs
        </button>
        {mode === 'local' ? (
          <span className="side-user">Local mode — no account</span>
        ) : (
          <>
            <span className="side-user" title={user?.email ?? ''}>
              {user?.email ?? 'Signed in'}
            </span>
            <button className="side-signout" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
