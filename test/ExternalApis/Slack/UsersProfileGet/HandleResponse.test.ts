import type { HttpClientError } from '@effect/platform'
import { it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/Slack/UsersProfileGet/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../fc.ts'

describe('HandleResponse', () => {
  describe('with a decodable body', () => {
    describe('when ok', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Slack/Samples/UsersProfileGet/Successes'),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.either(_.HandleResponse(response))

            expect(actual).toStrictEqual(Either.right(expect.anything()))
          }),
      )
    })

    describe('when not ok', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Slack/Samples/UsersProfileGet/Errors'),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.flip(_.HandleResponse(response))

            expect(actual._tag).toStrictEqual('SlackError')
          }),
      )
    })
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
