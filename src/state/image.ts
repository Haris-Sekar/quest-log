/** Longest-edge cap for images sent to Gemini — keeps tokens and upload small. */
const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8

export interface InlineImage {
  base64: string
  mimeType: string
}

/** Scale (w, h) so the longest edge is at most `max`, preserving aspect ratio.
 *  Never upscales. Pure. */
export const fitWithin = (w: number, h: number, max: number): { w: number; h: number } => {
  const longest = Math.max(w, h)
  if (longest <= max) return { w, h }
  const scale = max / longest
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

/** Decode an image file, downscale, and return base64 JPEG for a Gemini
 *  inline-data part. Throws Error('decode-failed') if the file can't be read. */
export const compressImage = (file: File): Promise<InlineImage> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_EDGE)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('decode-failed'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        const base64 = dataUrl.split(',')[1]
        if (!base64) throw new Error('decode-failed')
        resolve({ base64, mimeType: 'image/jpeg' })
      } catch {
        reject(new Error('decode-failed'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode-failed'))
    }
    img.src = url
  })
