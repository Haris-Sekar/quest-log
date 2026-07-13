import { useCallback, useEffect, useState } from 'react'
import { TABS, type TabId } from './tabs'

const TAB_IDS = new Set<string>(TABS.map((t) => t.id))
const DEFAULT_TAB: TabId = 'today'

const readHash = (): TabId => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return TAB_IDS.has(h) ? (h as TabId) : DEFAULT_TAB
}

/**
 * Tab state backed by the URL hash (e.g. #tasks) so a refresh, bookmark, or
 * back/forward lands on the same tab.
 */
export const useHashTab = (): [TabId, (t: TabId) => void] => {
  const [tab, setTab] = useState<TabId>(readHash)

  useEffect(() => {
    const onHashChange = () => setTab(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const select = useCallback((t: TabId) => {
    setTab(t)
    if (window.location.hash.replace(/^#\/?/, '') !== t) window.location.hash = t
  }, [])

  return [tab, select]
}
