import type { HttpClientError } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/Orcid/GetPersonalDetails/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'
import personalDetailsCreditName from '../Samples/personal-details-credit-name.json' with { type: 'json' }
import personalDetailsNoFamilyName from '../Samples/personal-details-no-family-name.json' with { type: 'json' }
import personalDetailsNoName from '../Samples/personal-details-no-name.json' with { type: 'json' }
import personalDetails from '../Samples/personal-details.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      test.prop([
        fc.httpClientResponse({
          json: fc.constantFrom(
            personalDetails,
            personalDetailsCreditName,
            personalDetailsNoFamilyName,
            personalDetailsNoName,
          ),
          status: fc.constant(StatusCodes.OK),
        }),
      ])('decodes the response', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.either(_.HandleResponse(response))

          expect(actual).toStrictEqual(Either.right(expect.anything()))
        }).pipe(EffectTest.run),
      )
    })

    describe('with an unknown JSON body', () => {
      test.prop([
        fc.httpClientResponse({
          json: fc.json(),
          status: fc.constant(StatusCodes.OK),
        }),
      ])('returns an error', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ParseError')
        }).pipe(EffectTest.run),
      )
    })

    describe('with an unknown body', () => {
      test.prop([
        fc.httpClientResponse({
          status: fc.constant(StatusCodes.OK),
          text: fc.lorem(),
        }),
      ])('returns an error', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ResponseError')
          expect((actual as HttpClientError.ResponseError).reason).toStrictEqual('Decode')
        }).pipe(EffectTest.run),
      )
    })
  })

  describe('with another status code', () => {
    test.prop([fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.OK) })])(
      'returns an error',
      response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ResponseError')
          expect((actual as HttpClientError.ResponseError).reason).toStrictEqual('StatusCode')
        }).pipe(EffectTest.run),
    )
  })
})
