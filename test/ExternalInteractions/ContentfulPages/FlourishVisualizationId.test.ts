import { describe, expect, it } from '../../vitest.ts'
import { Option } from 'effect'
import * as _ from '../../../src/ExternalInteractions/ContentfulPages/FlourishVisualizationId.ts'

describe('fromUrl', () => {
  it.each([
    'https://public.flourish.studio/visualisation/30698124/',
    'https://public.flourish.studio/visualisation/30698124',
    'https://public.flourish.studio/visualisation/30698124/?utm_source=showcase',
    'http://public.flourish.studio/visualisation/30698124/',
    'https://flo.uri.sh/visualisation/30698124/embed',
    'https://flo.uri.sh/visualisation/30698124/embed?auto=1',
    'https://flo.uri.sh/visualisation/30698124/embed#play-on-load',
  ])('finds the visualization ID in %s', url => {
    expect(_.fromUrl(new URL(url))).toStrictEqual(Option.some('30698124'))
  })

  it.each([
    'https://public.flourish.studio/',
    'https://app.flourish.studio/visualisation/30698124/edit',
    'https://public.flourish.studio/story/123456/',
    'https://public.flourish.studio/visualisation/abc/',
    'https://public.flourish.studio/visualisation/30698124/thumbnail',
    'https://public.flourish.studio.example.com/visualisation/30698124/',
    'https://example.com/flo.uri.sh/visualisation/30698124/',
  ])('finds nothing in %s', url => {
    expect(_.fromUrl(new URL(url))).toStrictEqual(Option.none())
  })
})

it('thumbnailUrl', () => {
  expect(_.thumbnailUrl(_.FlourishVisualizationId.make('30698124')).href).toBe(
    'https://public.flourish.studio/visualisation/30698124/thumbnail',
  )
})
