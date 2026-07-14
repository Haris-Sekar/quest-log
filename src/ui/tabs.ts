export type TabId =
  | 'today'
  | 'meals'
  | 'tasks'
  | 'calendar'
  | 'goals'
  | 'progress'
  | 'awards'
  | 'plan'

// Nav chrome uses plain geometric mono glyphs — no emoji. Emoji stays in content.
export const TABS: Array<{ id: TabId; icon: string; label: string }> = [
  { id: 'today', icon: '◆', label: 'Today' },
  { id: 'meals', icon: '●', label: 'Meals' },
  { id: 'tasks', icon: '☰', label: 'Tasks' },
  { id: 'calendar', icon: '▦', label: 'Calendar' },
  { id: 'goals', icon: '◎', label: 'Goals' },
  { id: 'progress', icon: '↗', label: 'Progress' },
  { id: 'awards', icon: '★', label: 'Awards' },
  { id: 'plan', icon: '§', label: 'Plan' },
]
