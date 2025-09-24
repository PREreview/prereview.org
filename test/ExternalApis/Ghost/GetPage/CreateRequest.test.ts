import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted, Tuple } from 'effect'
import * as _ from '../../../../src/ExternalApis/Ghost/GetPage/CreateRequest.ts'
import { Ghost } from '../../../../src/ExternalApis/index.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.ghostApi(), fc.string()])('creates a GET request', (ghostApi, id) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(id)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Ghost.GhostApi, ghostApi), EffectTest.run),
  )

  test.prop(
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
    {
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
  )('sets the URL', ([id, key, expectedUrl, expectedUrlParams]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(id)

      expect(actual.url).toStrictEqual(expectedUrl)
      expect(actual.urlParams).toStrictEqual(UrlParams.fromInput(expectedUrlParams))
    }).pipe(Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }), EffectTest.run),
  )

  test.prop([fc.ghostApi(), fc.string()])('sets the Accept header', (ghostApi, id) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(id)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Ghost.GhostApi, ghostApi), EffectTest.run),
  )
})
