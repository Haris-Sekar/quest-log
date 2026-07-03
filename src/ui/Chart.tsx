import { useState } from 'react'
import type { Stats, TrackerState, WeightEntry } from '../state/types'

const W = 560
const H = 260
const PAD = { l: 40, r: 14, t: 16, b: 26 }

const fmtDate = (d: string): string =>
  new Date(`${d}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export const Chart = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const [tip, setTip] = useState<WeightEntry | null>(null)
  const pts = stats.weights

  if (!pts.length) {
    return <div className="chart-empty">No weigh-ins yet. The line starts when you do.</div>
  }

  const kgs = pts.map((p) => p.kg)
  const lo = Math.min(state.goalWeight - 2, Math.min(...kgs) - 2)
  const hi = Math.max(state.startWeight + 2, Math.max(...kgs) + 2)
  const t0 = new Date(`${pts[0].d}T00:00`).getTime()
  const t1 = new Date(`${pts[pts.length - 1].d}T00:00`).getTime()
  const span = Math.max(t1 - t0, 86400000 * 7)
  const X = (d: string) => PAD.l + ((new Date(`${d}T00:00`).getTime() - t0) / span) * (W - PAD.l - PAD.r)
  const Y = (kg: number) => PAD.t + (1 - (kg - lo) / (hi - lo)) * (H - PAD.t - PAD.b)

  const gridKgs = []
  for (let kg = Math.ceil(lo / 10) * 10; kg <= hi; kg += 10) gridKgs.push(kg)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)} ${Y(p.kg).toFixed(1)}`).join(' ')
  const gy = Y(state.goalWeight)
  const last = pts[pts.length - 1]

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight over time, in kilograms" onClick={() => setTip(null)}>
        {gridKgs.map((kg) => (
          <g key={kg}>
            <line x1={PAD.l} y1={Y(kg)} x2={W - PAD.r} y2={Y(kg)} className="grid-line" />
            <text x={PAD.l - 6} y={Y(kg) + 3.5} textAnchor="end" className="axis-text">
              {kg}
            </text>
          </g>
        ))}
        <line x1={PAD.l} y1={gy} x2={W - PAD.r} y2={gy} className="goal-line" />
        <text x={W - PAD.r} y={gy - 5} textAnchor="end" className="goal-text">
          GOAL {state.goalWeight}
        </text>
        {pts.length > 1 && (
          <path
            d={`${path} L${X(last.d).toFixed(1)} ${H - PAD.b} L${X(pts[0].d).toFixed(1)} ${H - PAD.b} Z`}
            className="area-fill"
          />
        )}
        {pts.length > 1 && <path d={path} className="weight-line" />}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1
          return (
            <g key={p.d}>
              {isLast && <circle cx={X(p.d)} cy={Y(p.kg)} r={7} className="pt-ring" />}
              <circle cx={X(p.d)} cy={Y(p.kg)} r={isLast ? 4.5 : 3.5} className="pt" />
              <circle
                cx={X(p.d)}
                cy={Y(p.kg)}
                r={14}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setTip(tip?.d === p.d ? null : p)
                }}
              />
            </g>
          )
        })}
        <text x={PAD.l} y={H - 8} className="axis-text">
          {fmtDate(pts[0].d)}
        </text>
        {pts.length > 1 && (
          <text x={W - PAD.r} y={H - 8} textAnchor="end" className="axis-text">
            {fmtDate(last.d)}
          </text>
        )}
      </svg>
      {tip && (
        <div
          className="chart-tip"
          style={{ left: `${(X(tip.d) / W) * 100}%`, top: `${(Y(tip.kg) / H) * 100}%` }}
        >
          {fmtDate(tip.d)} · {tip.kg.toFixed(1)} kg
        </div>
      )}
    </div>
  )
}
