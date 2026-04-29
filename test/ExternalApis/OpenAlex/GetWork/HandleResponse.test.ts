import { it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/OpenAlex/GetWork/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../../../fc.ts'

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/OpenAlex/WorkSamples'),
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
            json: fc.json(),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('WorkIsUnavailable')
            expect(actual.cause).toMatchObject({ _tag: 'ParseError' })
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

            expect(actual._tag).toStrictEqual('WorkIsUnavailable')
            expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'Decode', response })
          }),
      )
    })
  })

  describe('with a 404 status code', () => {
    it.effect.prop(
      'returns an error',
      [fc.httpClientResponse({ status: fc.constant(StatusCodes.NotFound) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('WorkIsNotFound')
          expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'StatusCode', response })
        }),
    )
  })

  describe('with a 410 status code', () => {
    it.effect.prop(
      'returns an error',
      [fc.httpClientResponse({ status: fc.constant(StatusCodes.Gone) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('WorkIsNotFound')
          expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'StatusCode', response })
        }),
    )
  })

  describe('with another status code', () => {
    it.effect.prop(
      'returns an error',
      [
        fc.httpClientResponse({
          status: fc
            .statusCode()
            .filter(status => ![StatusCodes.OK, StatusCodes.NotFound, StatusCodes.Gone].includes(status)),
        }),
      ],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('WorkIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'StatusCode', response })
        }),
    )
  })
})
