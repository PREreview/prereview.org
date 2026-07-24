import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import { Array, Effect, pipe, Schema, Struct } from 'effect'
import { URL } from 'url'
import { Entries } from '../../../src/ExternalApis/Contentful/index.ts'
import { plainText, rawHtml } from '../../../src/html.ts'
import * as _ from '../../../src/SpotlightBanners/GetCurrentBanner/EntryToSpotlightBanner.ts'
import { SpotlightBanner } from '../../../src/SpotlightBanners/index.ts'

it.effect.each([
  {
    response: 'single-banner',
    index: 0,
    expected: new SpotlightBanner({
      id: '19ku1fGWddXyrFone7Pu62',
      title: plainText('Matchmaking experiment'),
      description: rawHtml('Check out our experiment for suggestions about what to review next!'),
      callToAction: {
        text: plainText('Find preprints to review'),
        url: new URL('https://matchmaking-experiment.prereview.org/'),
      },
      theme: 'product',
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
