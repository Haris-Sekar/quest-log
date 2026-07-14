import type { RecapData } from '../state/recap'

/* Renders a QuestLog "day recap" poster to a PNG blob on an off-screen canvas.
 * Canvas (not DOM rasterisation) so web fonts + emoji render reliably and the
 * output is pixel-deterministic. Colours are sRGB approximations of the app's
 * oklch tokens — canvas support for oklch is uneven across mobile browsers. */

const W = 1080
const H = 1400
const PAD = 72

const C = {
  bg: '#0b0e12',
  card: '#161a21',
  border: '#262d38',
  text: '#e8eaee',
  soft: '#c6cbd4',
  muted: '#6b7484',
  faint: '#3a4353',
  lime: '#a3e635',
  gold: '#e0a63c',
  track: '#232936',
}

const DISP = 'Space Grotesk'
const MONO = 'IBM Plex Mono'

const ensureFonts = async (): Promise<void> => {
  const faces = [
    `700 76px "${DISP}"`,
    `600 40px "${DISP}"`,
    `500 34px "${DISP}"`,
    `600 24px "${MONO}"`,
    `500 24px "${MONO}"`,
    `400 24px "${MONO}"`,
  ]
  try {
    await Promise.all(faces.map((f) => document.fonts.load(f)))
    await document.fonts.ready
  } catch {
    // Fonts may already be resolved or unavailable; draw with what we have.
  }
}

interface Ctx2D extends CanvasRenderingContext2D {
  letterSpacing: string
}

const spaced = (ctx: Ctx2D, px: number): void => {
  ctx.letterSpacing = `${px}px`
}

const roundRect = (ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Draw an emoji then a letter-spaced label after it; returns the end x. */
const emojiLabel = (
  ctx: Ctx2D,
  emoji: string,
  label: string,
  x: number,
  y: number,
  color: string,
): number => {
  ctx.save()
  ctx.textAlign = 'left'
  spaced(ctx, 0)
  ctx.font = `24px "${MONO}"`
  ctx.fillStyle = color
  ctx.fillText(emoji, x, y)
  const ew = ctx.measureText(emoji).width
  ctx.font = `600 22px "${MONO}"`
  spaced(ctx, 2)
  ctx.fillStyle = color
  ctx.fillText(label, x + ew + 14, y)
  ctx.restore()
  return x + ew + 14
}

const bar = (ctx: Ctx2D, x: number, y: number, w: number, pct: number, color: string): void => {
  spaced(ctx, 0)
  ctx.fillStyle = C.track
  roundRect(ctx, x, y, w, 12, 6)
  ctx.fill()
  const fill = Math.max(0, Math.min(1, pct)) * w
  if (fill > 0) {
    ctx.fillStyle = color
    roundRect(ctx, x, y, Math.max(12, fill), 12, 6)
    ctx.fill()
  }
}

interface MetricOpts {
  emoji: string
  label: string
  right?: string
  value: string
  unit?: string
  valueColor: string
  sub?: string
  subColor?: string
  barPct?: number
  gold?: boolean
}

const CARD_H = 200

const metricCard = (ctx: Ctx2D, x: number, y: number, w: number, o: MetricOpts): void => {
  ctx.fillStyle = C.card
  roundRect(ctx, x, y, w, CARD_H, 18)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = o.gold ? C.gold : C.border
  roundRect(ctx, x, y, w, CARD_H, 18)
  ctx.stroke()

  const ix = x + 30
  emojiLabel(ctx, o.emoji, o.label, ix, y + 48, C.muted)
  if (o.right) {
    ctx.save()
    ctx.textAlign = 'right'
    spaced(ctx, 1)
    ctx.font = `500 22px "${MONO}"`
    ctx.fillStyle = C.muted
    ctx.fillText(o.right, x + w - 30, y + 48)
    ctx.restore()
  }

  ctx.save()
  ctx.textAlign = 'left'
  spaced(ctx, 0)
  ctx.font = `700 62px "${DISP}"`
  ctx.fillStyle = o.valueColor
  ctx.fillText(o.value, ix, y + 118)
  const vw = ctx.measureText(o.value).width
  if (o.unit) {
    ctx.font = `500 30px "${DISP}"`
    ctx.fillStyle = C.muted
    ctx.fillText(o.unit, ix + vw + 12, y + 118)
  }
  ctx.restore()

  if (o.sub) {
    ctx.save()
    ctx.textAlign = 'left'
    spaced(ctx, 0)
    ctx.font = `500 23px "${MONO}"`
    ctx.fillStyle = o.subColor ?? C.muted
    ctx.fillText(o.sub, ix, y + 160)
    ctx.restore()
  }
  if (o.barPct !== undefined) {
    bar(ctx, ix, y + CARD_H - 40, w - 60, o.barPct, C.lime)
  }
}

export const renderShareCard = async (r: RecapData): Promise<Blob> => {
  await ensureFonts()

  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d') as Ctx2D
  if (!ctx) throw new Error('canvas-unavailable')
  ctx.scale(dpr, dpr)
  ctx.textBaseline = 'alphabetic'

  // Background + faint grid.
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'
  ctx.lineWidth = 1
  for (let gx = PAD; gx < W; gx += 96) {
    ctx.beginPath()
    ctx.moveTo(gx, 0)
    ctx.lineTo(gx, H)
    ctx.stroke()
  }
  for (let gy = 0; gy < H; gy += 96) {
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(W, gy)
    ctx.stroke()
  }

  // Header wordmark.
  ctx.textAlign = 'left'
  spaced(ctx, 4)
  ctx.font = `700 40px "${DISP}"`
  ctx.fillStyle = C.text
  ctx.fillText('QUEST', PAD, 96)
  const qw = ctx.measureText('QUEST').width
  ctx.fillStyle = C.lime
  ctx.fillText('LOG', PAD + qw + 4, 96)

  ctx.save()
  ctx.textAlign = 'right'
  spaced(ctx, 3)
  ctx.font = `500 23px "${MONO}"`
  ctx.fillStyle = C.muted
  ctx.fillText(`DAY RECAP // ${r.dateLabel}`, W - PAD, 92)
  ctx.restore()

  // Headline block.
  spaced(ctx, 4)
  ctx.font = `600 24px "${MONO}"`
  ctx.fillStyle = C.lime
  ctx.fillText(r.eyebrow, PAD, 184)
  spaced(ctx, 0)
  ctx.font = `700 76px "${DISP}"`
  ctx.fillStyle = C.text
  ctx.fillText(r.headline, PAD, 262)

  // Quests card.
  const qx = PAD
  const qy = 316
  const qw2 = W - 2 * PAD
  const innerX = qx + 32
  const innerW = qw2 - 64

  // measure chip rows first to size the card
  const chipH = 56
  const chipGap = 14
  const chipPadX = 20
  ctx.font = `600 24px "${MONO}"`
  type Chip = { text: string; w: number; done: boolean }
  const chips: Chip[] = r.quests.map((q) => {
    ctx.font = `500 24px "${DISP}"`
    spaced(ctx, 0)
    const label = `${q.icon} ${q.name} ${q.done ? '✓' : '–'}`
    const tw = ctx.measureText(label).width
    return { text: label, w: tw + chipPadX * 2, done: q.done }
  })
  // wrap into rows
  const rows: Chip[][] = [[]]
  let rowW = 0
  for (const c of chips) {
    const add = c.w + (rows[rows.length - 1].length ? chipGap : 0)
    if (rowW + add > innerW && rows[rows.length - 1].length) {
      rows.push([c])
      rowW = c.w
    } else {
      rows[rows.length - 1].push(c)
      rowW += add
    }
  }
  const chipsTop = qy + 130
  const qCardH = chipsTop - qy + rows.length * (chipH + chipGap) + 18

  ctx.fillStyle = C.card
  roundRect(ctx, qx, qy, qw2, qCardH, 20)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = C.border
  roundRect(ctx, qx, qy, qw2, qCardH, 20)
  ctx.stroke()

  ctx.textAlign = 'left'
  spaced(ctx, 3)
  ctx.font = `500 24px "${MONO}"`
  ctx.fillStyle = C.muted
  ctx.fillText('DAILY QUESTS', innerX, qy + 58)
  ctx.textAlign = 'right'
  spaced(ctx, 0)
  ctx.font = `700 34px "${DISP}"`
  ctx.fillStyle = C.lime
  ctx.fillText(`${r.questDone}/${r.questTotal}`, qx + qw2 - 32, qy + 62)
  ctx.textAlign = 'left'

  // segmented meter
  const segTotal = Math.max(1, r.questTotal)
  const segGap = 8
  const segW = (innerW - segGap * (segTotal - 1)) / segTotal
  const segY = qy + 84
  for (let i = 0; i < segTotal; i++) {
    const sx = innerX + i * (segW + segGap)
    ctx.fillStyle = i < r.questDone ? C.lime : C.track
    roundRect(ctx, sx, segY, segW, 14, 7)
    ctx.fill()
  }

  // chips
  let cy = chipsTop
  for (const row of rows) {
    let cx = innerX
    for (const c of row) {
      ctx.fillStyle = c.done ? 'rgba(163,230,53,0.10)' : C.card
      roundRect(ctx, cx, cy, c.w, chipH, chipH / 2)
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = c.done ? 'rgba(163,230,53,0.5)' : C.border
      roundRect(ctx, cx, cy, c.w, chipH, chipH / 2)
      ctx.stroke()
      ctx.font = `500 24px "${DISP}"`
      spaced(ctx, 0)
      ctx.fillStyle = c.done ? C.text : C.muted
      ctx.textAlign = 'left'
      ctx.fillText(c.text, cx + chipPadX, cy + 37)
      cx += c.w + chipGap
    }
    cy += chipH + chipGap
  }

  // Metric grid.
  const gap = 24
  const colW = (W - 2 * PAD - gap) / 2
  const rightX = PAD + colW + gap
  const gridTop = qy + qCardH + 28

  const row1 = gridTop
  const row2 = row1 + CARD_H + gap
  const row3 = row2 + CARD_H + gap

  metricCard(ctx, PAD, row1, colW, {
    emoji: '⚖️',
    label: 'WEIGHT',
    value: r.weight !== null ? r.weight.toFixed(1) : '—',
    unit: 'kg',
    valueColor: C.text,
    sub: `−${r.lost.toFixed(1)} kg total · ${r.toGo.toFixed(1)} to go`,
    subColor: C.lime,
  })
  metricCard(ctx, rightX, row1, colW, {
    emoji: '🔥',
    label: 'STREAK',
    value: String(r.streak),
    unit: 'days',
    valueColor: C.lime,
    sub: `best ${r.bestStreak} · alive & burning`,
    gold: true,
  })
  metricCard(ctx, PAD, row2, colW, {
    emoji: '🍽️',
    label: 'CALORIES',
    right: `cap ${r.kcalCap}`,
    value: String(r.kcal),
    valueColor: C.lime,
    barPct: r.kcal / r.kcalCap,
  })
  metricCard(ctx, rightX, row2, colW, {
    emoji: '🍗',
    label: 'PROTEIN',
    right: `floor ${r.proteinFloor}g`,
    value: `${r.protein}g`,
    valueColor: C.lime,
    barPct: r.protein / r.proteinFloor,
  })
  metricCard(ctx, PAD, row3, colW, {
    emoji: '✨',
    label: 'XP EARNED TODAY',
    value: `+${r.xpToday}`,
    unit: `LVL ${r.level}`,
    valueColor: C.lime,
    barPct: r.levelSpan > 0 ? r.levelInto / r.levelSpan : 0,
  })
  metricCard(ctx, rightX, row3, colW, {
    emoji: '🗓️',
    label: 'DAY OF THE RUN',
    value: String(r.dayNo),
    valueColor: C.text,
    sub: 'grind logged',
  })

  // Footer.
  const footY = H - 96
  if (r.bossName) {
    emojiLabel(ctx, '⚔️', `IN FIGHT: ${r.bossName.toUpperCase()}`, PAD, footY, C.gold)
    ctx.textAlign = 'left'
    spaced(ctx, 0)
    ctx.font = `500 28px "${DISP}"`
    ctx.fillStyle = C.soft
    ctx.fillText(
      r.bossGap && r.bossGap > 0 ? `${r.bossGap} kg until it falls` : 'On the ropes — finish it.',
      PAD,
      footY + 44,
    )
  } else {
    emojiLabel(ctx, '🏆', 'FINAL BOSS DOWN', PAD, footY, C.gold)
    ctx.textAlign = 'left'
    spaced(ctx, 0)
    ctx.font = `500 28px "${DISP}"`
    ctx.fillStyle = C.soft
    ctx.fillText('Goal weight reached. GG.', PAD, footY + 44)
  }

  ctx.save()
  ctx.textAlign = 'right'
  spaced(ctx, 2)
  ctx.font = `700 44px "${DISP}"`
  ctx.fillStyle = C.lime
  ctx.fillText(`DAY ${r.dayNo}`, W - PAD, footY + 30)
  ctx.restore()

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/png')
  })
}
