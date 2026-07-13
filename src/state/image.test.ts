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
})
