import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import { Array, Effect, pipe, Schema, Struct } from 'effect'
import { URL } from 'url'
import { Entries } from '../../../src/ExternalApis/Contentful/index.ts'
import { rawHtml } from '../../../src/html.ts'
import * as _ from '../../../src/SpotlightBanners/GetCurrentBanner/EntryToSpotlightBanner.ts'
import { SpotlightBanner } from '../../../src/SpotlightBanners/index.ts'

it.effect.each([
  {
    response: 'banners-without-locales',
    index: 0,
    expected: new SpotlightBanner({
      id: '19ku1fGWddXyrFone7Pu62',
      title: rawHtml('<span lang="en-US" dir="ltr">Matchmaking experiment</span>'),
      description: rawHtml(
        '<span lang="en-US" dir="ltr">Check out our experiment for suggestions about what to review next!</span>',
      ),
      callToAction: {
        text: rawHtml('<span lang="en-US" dir="ltr">Find preprints to review</span>'),
        url: new URL('https://matchmaking-experiment.prereview.org/'),
      },
      theme: 'product',
    }),
  },
  {
    response: 'banners-without-locales',
    index: 1,
    expected: new SpotlightBanner({
      id: '7Qm2xVJc9LpRtaN4eYk8Hs',
      title: rawHtml('<span lang="en-US" dir="ltr">Review-a-thon (14–18 September, 2026)</span>'),
      description: rawHtml(
        '<span lang="en-US" dir="ltr">Gather your community to review preprints or datasets together and win a prize!</span>',
      ),
      callToAction: {
        text: rawHtml('<span lang="en-US" dir="ltr">Register your Club</span>'),
        url: new URL('https://prereview.org/clubs'),
      },
      theme: 'community',
    }),
  },
])('can parse a record ($response $index)', ({ response, index, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/Samples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Entries))),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.get(index)),
      Effect.andThen(Schema.decodeUnknown(_.EntryToSpotlightBanner)),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)

it.effect.each([['banners']])("can't parse a record (%s)", ([response]) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/Samples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Entries))),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.map(item => Schema.decodeUnknown(_.EntryToSpotlightBanner)(item))),
      Effect.andThen(Effect.allWith({ concurrency: 'unbounded', mode: 'either' })),
    )

    actual.forEach(result => {
      expect(result).toMatchObject({ _tag: 'Left' })
    })
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)
