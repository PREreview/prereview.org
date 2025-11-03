import type { HttpClientError } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/Slack/ChatPostMessage/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('HandleResponse', () => {
  describe('with a decodable body', () => {
    describe('when ok', () => {
      test.prop([
        fc.httpClientResponse({
          body: fc.fileInDirectory('test/ExternalApis/Slack/Samples/ChatPostMessage/Successes'),
        }),
      ])('decodes the response', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.either(_.HandleResponse(response))

          expect(actual).toStrictEqual(Either.void)
        }).pipe(EffectTest.run),
      )
    })

    describe('when not ok', () => {
      test.prop([
        fc.httpClientResponse({
          body: fc.fileInDirectory('test/ExternalApis/Slack/Samples/ChatPostMessage/Errors'),
        }),
      ])('returns an error', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('SlackError')
        }).pipe(EffectTest.run),
      )
    })
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
        body: fc.lorem(),
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
