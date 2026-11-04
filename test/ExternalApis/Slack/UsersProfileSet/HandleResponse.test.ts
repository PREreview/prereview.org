import type { HttpClientError } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Result } from 'effect'
import * as _ from '../../../../src/ExternalApis/Slack/UsersProfileSet/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../fc.ts'

describe('HandleResponse', () => {
  describe('with a decodable body', () => {
    describe('when ok', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Slack/Samples/UsersProfileSet/Successes'),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            expect(actual).toStrictEqual(Result.succeed(undefined))
          }),
      )
    })

    describe('when not ok', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            body: fc.fileInDirectory('test/ExternalApis/Slack/Samples/UsersProfileSet/Errors'),
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
