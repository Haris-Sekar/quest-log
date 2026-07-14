import { useEffect, useRef, useState } from 'react'
import { buildRecap } from '../state/recap'
import type { Stats, TrackerState } from '../state/types'
import { renderShareCard } from './shareCard'
import { useToast } from './Toast'

interface ShareModalProps {
  state: TrackerState
  stats: Stats
  onClose: () => void
}

type Phase = 'rendering' | 'ready' | 'error'

/** Renders today's recap poster to a PNG, previews it, and offers native share
 *  (Web Share API, mobile) or download. The blob is prepared up front so the
 *  share/download call fires synchronously inside its own click — some browsers
 *  drop the share sheet if it isn't triggered by a fresh user gesture. */
export const ShareModal = ({ state, stats, onClose }: ShareModalProps) => {
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('rendering')
  const [url, setUrl] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)
  const dayNoRef = useRef<number>(0)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    ;(async () => {
      try {
        const recap = buildRecap(state, stats)
        dayNoRef.current = recap.dayNo
        const blob = await renderShareCard(recap)
        if (cancelled) return
        fileRef.current = new File([blob], `questlog-day-${recap.dayNo}.png`, { type: 'image/png' })
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setPhase('ready')
      } catch (err) {
        if (import.meta.env.DEV) console.error('Share card render failed:', err)
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [state, stats])

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    fileRef.current !== null &&
    navigator.canShare({ files: [fileRef.current] })

  const share = async () => {
    const file = fileRef.current
    if (!file) return
    try {
      await navigator.share({
        files: [file],
        title: 'QuestLog',
        text: `Day ${dayNoRef.current} of the run. 150 → 90.`,
      })
    } catch (err) {
      // User dismissing the share sheet throws AbortError — not an error.
      if (err instanceof Error && err.name === 'AbortError') return
      toast('⚠️ Share failed', 'Try downloading the image instead.')
    }
  }

  const download = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `questlog-day-${dayNoRef.current}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast('📷 Saved', 'Recap image downloaded.')
  }

  return (
    <div className="share-overlay" role="dialog" aria-modal="true" aria-label="Share today's run" onClick={onClose}>
      <div className="share-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="share-head">
          <span className="share-title">Share today's run</span>
          <button className="share-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="share-preview">
          {phase === 'rendering' && <div className="share-status">Rendering your recap…</div>}
          {phase === 'error' && <div className="share-status">Couldn't build the image. Try again.</div>}
          {phase === 'ready' && url && <img src={url} alt="Today's recap poster" />}
        </div>

        <div className="share-actions">
          {canShareFiles && (
            <button className="btn solid wide" onClick={() => void share()} disabled={phase !== 'ready'}>
              ↗ Share
            </button>
          )}
          <button className="btn wide" onClick={download} disabled={phase !== 'ready'}>
            ⤓ Download image
          </button>
        </div>
      </div>
    </div>
  )
}
