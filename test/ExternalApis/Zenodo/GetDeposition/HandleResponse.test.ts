import type { HttpClientError } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/Zenodo/GetDeposition/HandleResponse.js'
import * as StatusCodes from '../../../../src/StatusCodes.js'
import * as EffectTest from '../../../EffectTest.js'
import * as fc from '../fc.js'
import unsubmittedDeposition from '../Samples/unsubmitted-deposition.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      test.prop([
        fc.httpClientResponse({
          json: fc.constant(unsubmittedDeposition),
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
