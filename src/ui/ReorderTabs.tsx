import { useState } from 'react'
import { TAB_MAP, type TabId } from './tabs'

interface ReorderTabsProps {
  order: TabId[]
  onChange: (order: TabId[]) => void
  onReset: () => void
  onClose: () => void
}

/** Reorder sheet — a vertical list (no horizontal-scroll conflict with the
 *  bar). Drag the grip on pointer devices, or use the arrows on touch. Changes
 *  apply and persist live. The first four rows are what show in the bottom bar;
 *  the rest scroll. */
export const ReorderTabs = ({ order, onChange, onReset, onClose }: ReorderTabsProps) => {
  const [drag, setDrag] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div
      className="share-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Reorder tabs"
      onClick={onClose}
    >
      <div className="share-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="share-head">
          <span className="share-title">Reorder tabs</span>
          <button className="share-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="reorder-hint">
          Drag the grip or use the arrows. The first four show in the bar — the rest scroll.
        </p>
        <ul className="reorder-list">
          {order.map((id, i) => {
            const t = TAB_MAP[id]
            return (
              <li
                key={id}
                className={`reorder-row${drag === i ? ' dragging' : ''}${i === 3 ? ' fold' : ''}`}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (drag !== null && drag !== i) {
                    move(drag, i)
                    setDrag(i)
                  }
                }}
                onDragEnd={() => setDrag(null)}
              >
                <span className="reorder-grip" aria-hidden>
                  ⠿
                </span>
                <span className="reorder-ico" aria-hidden>
                  <t.Icon />
                </span>
                <span className="reorder-label">{t.label}</span>
                {i < 4 && <span className="reorder-badge">IN BAR</span>}
                <span className="reorder-moves">
                  <button aria-label={`Move ${t.label} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${t.label} down`}
                    disabled={i === order.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="share-actions">
          <button className="btn ghost wide" onClick={onReset}>
            Reset to default
          </button>
          <button className="btn solid wide" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
