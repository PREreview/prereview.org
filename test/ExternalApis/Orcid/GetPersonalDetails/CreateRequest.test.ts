import { Headers } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Option, Redacted, Tuple } from 'effect'
import { Orcid } from '../../../../src/ExternalApis/index.js'
import * as _ from '../../../../src/ExternalApis/Orcid/GetPersonalDetails/CreateRequest.js'
import { OrcidId } from '../../../../src/types/index.js'
import * as EffectTest from '../../../EffectTest.js'
import * as fc from '../fc.js'

describe('CreateRequest', () => {
  test.prop([fc.orcidApi(), fc.orcidId()])('creates a GET request', (orcidApi, orcidId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(orcidId)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Orcid.OrcidApi, orcidApi), EffectTest.run),
  )

  test.prop(
    [
      fc
        .tuple(fc.origin(), fc.orcidId(), fc.option(fc.string(), { nil: undefined }))
        .map(([origin, orcidId, token]) =>
          Tuple.make<[string, string, string, string?]>(
            origin.href,
            orcidId,
            `${origin.origin}/v3.0/${orcidId}/personal-details`,
            token,
          ),
        ),
    ],
    {
      examples: [
        [
          [
            'https://pub.orcid.org/',
            '0000-0003-4921-6155',
            'https://pub.orcid.org/v3.0/0000-0003-4921-6155/personal-details',
          ],
        ],
      ],
    },
  )('sets the URL', ([origin, orcidId, expected, token]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(OrcidId.OrcidId(orcidId))

      expect(actual.url).toStrictEqual(expected)
    }).pipe(
      Effect.provideService(Orcid.OrcidApi, {
        origin: new URL(origin),
        token: Option.map(Option.fromNullable(token), Redacted.make),
      }),
      EffectTest.run,
    ),
  )

  test.prop([fc.orcidApi(), fc.orcidId()])('sets the Accept header', (orcidApi, orcidId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(orcidId)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Orcid.OrcidApi, orcidApi), EffectTest.run),
  )

  describe('when there is a token', () => {
    test.prop([fc.origin(), fc.redacted(fc.string()), fc.orcidId()])(
      'sets the Authorization header',
      (origin, token, orcidId) =>
        Effect.gen(function* () {
          const actual = yield* _.CreateRequest(orcidId)

          expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(token)}`)
        }).pipe(Effect.provideService(Orcid.OrcidApi, { origin, token: Option.some(token) }), EffectTest.run),
    )
  })

  describe("when there isn't a token", () => {
    test.prop([fc.origin(), fc.orcidId()])('does not set the Authorization header', (origin, orcidId) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(orcidId)

        expect(Headers.has(actual.headers, 'authorization')).toBeFalsy()
      }).pipe(Effect.provideService(Orcid.OrcidApi, { origin, token: Option.none() }), EffectTest.run),
    )
  })
})
