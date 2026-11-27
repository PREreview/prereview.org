import { Effect, Result } from 'effect'
import type { HttpClientError } from 'effect/http'
import * as _ from '../../../../src/ExternalApis/Zenodo/CreateDraft/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'
import draftInACommunity from '../Samples/draft-in-a-community.json' with { type: 'json' }
import draft from '../Samples/draft.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 201 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response, keeping every field',
        [
          fc.httpClientResponse({
            json: fc.constant(draft),
            status: fc.constant(StatusCodes.Created),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            expect(actual).toStrictEqual(Result.succeed(draft))
          }),
      )

      it.effect.prop(
        'decodes the communities',
        [
          fc.httpClientResponse({
            json: fc.constant(draftInACommunity),
            status: fc.constant(StatusCodes.Created),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* _.HandleResponse(response)

            expect(actual).toStrictEqual(draftInACommunity)
            expect(actual.parent.communities.ids).toStrictEqual(['fa23f142-2b05-4a2a-a559-3b955e5a2923'])
          }),
      )
    })

    describe('with an unknown JSON body', () => {
      it.effect.prop(
        'returns an error',
        [
          fc.httpClientResponse({
            json: fc.json(),
            status: fc.constant(StatusCodes.Created),
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
            status: fc.constant(StatusCodes.Created),
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
      [fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.Created) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('HttpClientError')
          expect((actual as HttpClientError.HttpClientError).reason._tag).toStrictEqual('StatusCodeError')
        }),
    )
  })
})
