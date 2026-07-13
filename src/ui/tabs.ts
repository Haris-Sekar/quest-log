export type TabId = 'today' | 'meals' | 'progress' | 'awards' | 'plan'

export const TABS: Array<{ id: TabId; icon: string; label: string }> = [
  { id: 'today', icon: '⚔️', label: 'Today' },
  { id: 'meals', icon: '🍽️', label: 'Meals' },
  { id: 'progress', icon: '📈', label: 'Progress' },
  { id: 'awards', icon: '🏆', label: 'Awards' },
  { id: 'plan', icon: '📜', label: 'Plan' },
]
