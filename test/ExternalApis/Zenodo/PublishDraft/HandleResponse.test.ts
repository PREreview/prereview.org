import { Effect, Result } from 'effect'
import * as _ from '../../../../src/ExternalApis/Zenodo/PublishDraft/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'
import draftSample from '../Samples/draft.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 202 status code', () => {
    it.effect.prop(
      'return nothing',
      [
        fc.oneof(
          fc.httpClientResponse({
            json: fc.constant(draftSample),
            status: fc.constant(StatusCodes.Accepted),
          }),
          fc.httpClientResponse({
            status: fc.constant(StatusCodes.Accepted),
          }),
        ),
      ],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.result(_.HandleResponse(response))

          expect(actual).toStrictEqual(Result.void)
        }),
    )
  })

  describe('with another status code', () => {
    it.effect.prop(
      'returns an error',
      [fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.Accepted) })],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('HttpClientError')
          expect(actual.reason._tag).toStrictEqual('StatusCodeError')
        }),
    )
  })
})
