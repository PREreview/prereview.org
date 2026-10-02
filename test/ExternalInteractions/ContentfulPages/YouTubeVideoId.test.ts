import { describe, expect, it } from '@effect/vitest'
import { Option } from 'effect'
import * as _ from '../../../src/ExternalInteractions/ContentfulPages/YouTubeVideoId.ts'

describe('fromUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=D-HFj6xTUz-rzfL2',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ?feature=shared',
  ])('finds the video ID in %s', url => {
    expect(_.fromUrl(new URL(url))).toStrictEqual(Option.some('dQw4w9WgXcQ'))
  })

  it.each([
    'https://www.youtube.com/',
    'https://www.youtube.com/@Prereview',
    'https://www.youtube.com/watch?list=PL1234567890',
    'https://www.youtube.com/watch?v=too-short',
    'https://youtu.be/',
    'https://vimeo.com/123456789',
    'https://example.com/watch?v=dQw4w9WgXcQ',
  ])('finds nothing in %s', url => {
    expect(_.fromUrl(new URL(url))).toStrictEqual(Option.none())
  })
})

it('thumbnailUrl', () => {
  expect(_.thumbnailUrl('dQw4w9WgXcQ').href).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
})
