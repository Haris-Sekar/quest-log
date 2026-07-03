export type TabId = 'today' | 'progress' | 'awards' | 'plan'

export const TABS: Array<{ id: TabId; icon: string; label: string }> = [
  { id: 'today', icon: '⚔️', label: 'Today' },
  { id: 'progress', icon: '📈', label: 'Progress' },
  { id: 'awards', icon: '🏆', label: 'Awards' },
  { id: 'plan', icon: '📜', label: 'Plan' },
]
