import type { HttpClientError } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Result } from 'effect'
import * as _ from '../../../../src/ExternalApis/Cloudinary/UploadImage/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../fc.ts'

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Cloudinary/Samples/UploadImage/Successes'),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            expect(actual).toStrictEqual(Result.succeed(expect.any(String)))
          }),
      )

      it.effect.prop(
        'returns the public ID',
        [
          fc.nonEmptyStringOf(fc.alphanumeric()).chain(publicId =>
            fc.tuple(
              fc.constant(publicId),
              fc.httpClientResponse({
                json: fc.constant({ public_id: publicId }),
                status: fc.constant(StatusCodes.OK),
              }),
            ),
          ),
        ],
        ([[publicId, response]]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            expect(actual).toStrictEqual(Result.succeed(publicId))
          }),
      )
    })

    describe('with an empty public ID', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            json: fc.constant({ public_id: '' }),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('SchemaError')
          }),
      )
    })

    describe('with an unknown JSON body', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            json: fc.json(),
            status: fc.constant(StatusCodes.OK),
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
            status: fc.constant(StatusCodes.OK),
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
      [fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.OK) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('HttpClientError')
          expect((actual as HttpClientError.HttpClientError).reason._tag).toStrictEqual('StatusCodeError')
        }),
    )
  })
})
