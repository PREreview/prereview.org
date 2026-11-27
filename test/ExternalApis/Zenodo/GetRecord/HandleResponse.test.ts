import { Effect, Result } from 'effect'
import type { HttpClientError } from 'effect/http'
import * as _ from '../../../../src/ExternalApis/Zenodo/GetRecord/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Uuid } from '../../../../src/types/Uuid.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'
import publishedRecord from '../Samples/published-record.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      it.effect.prop(
        'decodes the response',
        [
          fc.httpClientResponse({
            json: fc.constant(publishedRecord),
            status: fc.constant(StatusCodes.OK),
          }),
        ],
        ([response]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.result(_.HandleResponse(response))

            expect(actual).toStrictEqual(
              Result.succeed({
                id: 650679,
                pids: { doi: { identifier: Doi('10.5072/zenodo.650679') } },
                parent: { communities: { ids: [Uuid('fa23f142-2b05-4a2a-a559-3b955e5a2923')] } },
              }),
            )
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
