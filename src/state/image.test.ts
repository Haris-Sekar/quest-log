import { describe, expect, it } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  it('leaves an image already within bounds unchanged', () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ w: 800, h: 600 })
  })

  it('scales a wide image so the longest edge equals max', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ w: 1024, h: 768 })
  })

  it('scales a tall image so the height equals max', () => {
    expect(fitWithin(3000, 4000, 1024)).toEqual({ w: 768, h: 1024 })
  })

  it('never upscales a small image', () => {
    expect(fitWithin(200, 100, 1024)).toEqual({ w: 200, h: 100 })
  })

  it('rounds scaled dimensions to integers', () => {
    // 1000x333 capped at 500 -> scale 0.5 -> 500 x 166.5 -> rounds to 167
    expect(fitWithin(1000, 333, 500)).toEqual({ w: 500, h: 167 })
  })

  it('leaves an image whose longest edge equals max unchanged', () => {
    expect(fitWithin(1024, 768, 1024)).toEqual({ w: 1024, h: 768 })
  })
})
