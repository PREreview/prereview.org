import type { HttpClientError } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Predicate } from 'effect'
import * as _ from '../../../../src/ExternalApis/Orcid/GetPersonalDetails/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../../../fc.ts'

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Orcid/Samples'),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.either(_.HandleResponse(response))

            expect(actual).toStrictEqual(Either.right(expect.anything()))
          }),
      )
    })

    describe('with an unknown JSON body', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            json: fc.json().filter(Predicate.not(Predicate.hasProperty('name'))),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('ParseError')
          }),
      )
    })

    describe('with an unknown body', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            status: fc.constant(StatusCodes.OK),
            body: fc.lorem(),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('ResponseError')
            expect((actual as HttpClientError.ResponseError).reason).toStrictEqual('Decode')
          }),
      )
    })
  })

  describe('with another status code', () => {
    it.effect.prop(
      'returns an error',
      [fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.OK) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ResponseError')
          expect((actual as HttpClientError.ResponseError).reason).toStrictEqual('StatusCode')
        }),
    )
  })
})
