import { useMemo, useState } from 'react'
import { SignIn } from './auth/SignIn'
import { Awards } from './pages/Awards'
import { Plan } from './pages/Plan'
import { Progress } from './pages/Progress'
import { Today } from './pages/Today'
import { computeStats } from './state/stats'
import { useStore } from './store'
import { Hud } from './ui/Hud'
import { Sidebar, TabBar } from './ui/Nav'
import type { TabId } from './ui/tabs'

const Splash = ({ text }: { text: string }) => (
  <div className="splash">
    <div className="signin-logo">⚔️</div>
    <p>{text}</p>
  </div>
)

export const App = () => {
  const { mode, user, authReady, state } = useStore()
  const [tab, setTab] = useState<TabId>('today')
  const stats = useMemo(() => (state ? computeStats(state) : null), [state])

  if (!authReady) return <Splash text="Loading…" />
  if (mode === 'firebase' && !user) return <SignIn />
  if (!state || !stats) return <Splash text="Syncing your run…" />

  return (
    <div className="app">
      <Sidebar tab={tab} onTab={setTab} stats={stats} />
      <div className="main">
        <header className="hud">
          <Hud stats={stats} />
        </header>
        <main className="shell">
          {tab === 'today' && <Today state={state} stats={stats} />}
          {tab === 'progress' && <Progress state={state} stats={stats} />}
          {tab === 'awards' && <Awards state={state} />}
          {tab === 'plan' && <Plan state={state} stats={stats} />}
        </main>
      </div>
      <TabBar tab={tab} onTab={setTab} />
    </div>
  )
}
