import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Result } from 'effect'
import * as _ from '../../../../src/ExternalApis/Contentful/GetAssets/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../../../fc.ts'

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Contentful/GetAssets/Samples'),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            if (Result.isFailure(actual)) {
              console.error(actual.failure)
            }

            expect(actual).toStrictEqual(Result.succeed(expect.anything()))
          }),
      )
    })

    describe('with an unknown JSON body', () => {
      it.effect.prop(
        'returns an error',
        [fc.httpClientResponse({ json: fc.json(), status: fc.constant(StatusCodes.OK) })],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('ContentfulIsUnavailable')
            expect(actual.cause).toMatchObject({ _tag: 'SchemaError' })
          }),
      )
    })

    describe('with an unknown body', () => {
      it.effect.prop(
        'returns an error',
        [fc.httpClientResponse({ status: fc.constant(StatusCodes.OK), body: fc.lorem() })],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('ContentfulIsUnavailable')
            expect(actual.cause).toMatchObject({ _tag: 'HttpClientError', reason: { _tag: 'DecodeError', response } })
          }),
      )
    })
  })

  describe('with another status code', () => {
    it.effect.prop(
      'returns an error with the Contentful error',
      [
        fc
          .record({
            sys: fc.record({ type: fc.constant('Error'), id: fc.string() }),
            message: fc.string(),
            requestId: fc.string(),
          })
          .chain(errorResponse =>
            fc.tuple(
              fc.constant(errorResponse),
              fc.httpClientResponse({
                json: fc.constant(errorResponse),
                status: fc.statusCode().filter(status => status >= 400),
              }),
            ),
          ),
      ],
      ([[errorResponse, response]]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ContentfulIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'HttpClientError', reason: { _tag: 'StatusCodeError', response } })
          expect(actual.response).toStrictEqual(errorResponse)
        }),
    )

    it.effect.prop(
      'returns an error without the Contentful error when the body cannot be decoded',
      [
        fc.oneof(
          fc.httpClientResponse({ json: fc.json(), status: fc.statusCode().filter(status => status >= 400) }),
          fc.httpClientResponse({ body: fc.lorem(), status: fc.statusCode().filter(status => status >= 400) }),
        ),
      ],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ContentfulIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'HttpClientError', reason: { _tag: 'StatusCodeError', response } })
          expect(actual.response).toBeUndefined()
        }),
    )

    it.effect.prop(
      'returns an error',
      [fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.OK) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ContentfulIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'HttpClientError', reason: { _tag: 'StatusCodeError', response } })
        }),
    )
  })
})
