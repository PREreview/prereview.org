import { Headers } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Option, Redacted, Tuple } from 'effect'
import { Orcid } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Orcid/GetPersonalDetails/CreateRequest.ts'
import { OrcidId } from '../../../../src/types/index.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a GET request', [fc.orcidApi(), fc.orcidId()], ([orcidApi, orcidId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(orcidId)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Orcid.OrcidApi, orcidApi)),
  )

  it.effect.prop(
    'sets the URL',
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
    ([[origin, orcidId, expected, token]]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(OrcidId.OrcidId(orcidId))

        expect(actual.url).toStrictEqual(expected)
      }).pipe(
        Effect.provideService(Orcid.OrcidApi, {
          origin: new URL(origin),
          token: Option.map(Option.fromNullable(token), Redacted.make),
        }),
      ),
    {
      fastCheck: {
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
    },
  )

  it.effect.prop('sets the Accept header', [fc.orcidApi(), fc.orcidId()], ([orcidApi, orcidId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(orcidId)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Orcid.OrcidApi, orcidApi)),
  )

  describe('when there is a token', () => {
    it.effect.prop(
      'sets the Authorization header',
      [fc.origin(), fc.redacted(fc.string()), fc.orcidId()],
      ([origin, token, orcidId]) =>
        Effect.gen(function* () {
          const actual = yield* _.CreateRequest(orcidId)

          expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(token)}`)
        }).pipe(Effect.provideService(Orcid.OrcidApi, { origin, token: Option.some(token) })),
    )
  })

  describe("when there isn't a token", () => {
    it.effect.prop('does not set the Authorization header', [fc.origin(), fc.orcidId()], ([origin, orcidId]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(orcidId)

        expect(Headers.has(actual.headers, 'authorization')).toBeFalsy()
      }).pipe(Effect.provideService(Orcid.OrcidApi, { origin, token: Option.none() })),
    )
  })
})
