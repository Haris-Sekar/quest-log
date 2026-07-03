export const pad2 = (n: number): string => String(n).padStart(2, '0')

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export const todayKey = (): string => dateKey(new Date())

export const prevKey = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d - 1))
}

export const daysBetween = (fromKey: string, toKey: string): number =>
  Math.round(
    (new Date(`${toKey}T00:00`).getTime() - new Date(`${fromKey}T00:00`).getTime()) / 86400000,
  )

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
