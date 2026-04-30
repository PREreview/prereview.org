import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Redacted, Tuple } from 'effect'
import * as _ from '../../../../src/ExternalApis/Ghost/GetPage/CreateRequest.ts'
import { Ghost } from '../../../../src/ExternalApis/index.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a GET request', [fc.ghostApi(), fc.string()], ([ghostApi, id]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(id)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Ghost.GhostApi, ghostApi)),
  )

  it.effect.prop(
    'sets the URL',
    [
      fc
        .tuple(fc.string(), fc.string())
        .map(([id, key]) =>
          Tuple.make<[string, string, string, UrlParams.Input]>(
            id,
            key,
            `https://content.prereview.org/ghost/api/content/pages/${id}/`,
            { key },
          ),
        ),
    ],
    ([[id, key, expectedUrl, expectedUrlParams]]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(id)

        expect(actual.url).toStrictEqual(expectedUrl)
        expect(actual.urlParams).toStrictEqual(UrlParams.fromInput(expectedUrlParams))
      }).pipe(Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) })),
    {
      fastCheck: {
        examples: [
          [
            [
              '6154aa157741400e8722bb14',
              'some-key',
              'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14/',
              { key: 'some-key' },
            ],
          ],
        ],
      },
    },
  )

  it.effect.prop('sets the Accept header', [fc.ghostApi(), fc.string()], ([ghostApi, id]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(id)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Ghost.GhostApi, ghostApi)),
  )
})
