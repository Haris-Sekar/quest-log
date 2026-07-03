import { useStore } from '../store'
import type { Stats } from '../state/types'
import { Hud } from './Hud'
import { TABS, type TabId } from './tabs'

interface NavProps {
  tab: TabId
  onTab: (t: TabId) => void
  stats: Stats
}

/** Bottom tab bar — mobile only (hidden on desktop via CSS). */
export const TabBar = ({ tab, onTab }: Pick<NavProps, 'tab' | 'onTab'>) => (
  <nav className="tabbar" aria-label="Sections">
    <div className="tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab-btn${tab === t.id ? ' on' : ''}`}
          onClick={() => onTab(t.id)}
        >
          <span className="t-ico">{t.icon}</span>
          <span className="t-lbl">{t.label}</span>
        </button>
      ))}
    </div>
  </nav>
)

/** Sidebar — desktop only (hidden on mobile via CSS). */
export const Sidebar = ({ tab, onTab, stats }: NavProps) => {
  const { user, mode, signOut } = useStore()
  return (
    <aside className="sidebar">
      <div className="side-logo">
        ⚔️ QuestLog <span className="side-sub">150 → 90</span>
      </div>
      <Hud stats={stats} />
      <nav className="side-nav" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`side-btn${tab === t.id ? ' on' : ''}`}
            onClick={() => onTab(t.id)}
          >
            <span className="t-ico">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>
      <div className="side-foot">
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
