import type { HttpClientError } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Result } from 'effect'
import * as _ from '../../../../src/ExternalApis/Zenodo/PublishDeposition/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../fc.ts'
import submittedDeposition from '../Samples/submitted-deposition.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 202 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            json: fc.constant(submittedDeposition),
            status: fc.constant(StatusCodes.Accepted),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            expect(actual).toStrictEqual(Result.succeed(expect.anything()))
          }),
      )
    })

    describe('with an unknown JSON body', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            json: fc.json(),
            status: fc.constant(StatusCodes.Accepted),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('SchemaError')
          }),
      )
    })

    describe('with an unknown body', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            status: fc.constant(StatusCodes.Accepted),
            body: fc.lorem(),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('HttpClientError')
            expect((actual as HttpClientError.HttpClientError).reason._tag).toStrictEqual('DecodeError')
          }),
      )
    })
  })

  describe('with another status code', () => {
    it.effect.prop(
      'returns an error',
      [fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.Accepted) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('HttpClientError')
          expect((actual as HttpClientError.HttpClientError).reason._tag).toStrictEqual('StatusCodeError')
        }),
    )
  })
})
