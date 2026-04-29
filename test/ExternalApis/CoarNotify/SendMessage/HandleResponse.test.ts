import { it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/CoarNotify/SendMessage/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as fc from '../../../fc.ts'

describe('HandleResponse', () => {
  describe('with an Accepted or Created status code', () => {
    it.effect.prop(
      'returns nothing',
      [
        fc.httpClientResponse({
          status: fc.constantFrom(StatusCodes.Accepted, StatusCodes.Created),
        }),
      ],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.either(_.HandleResponse(response))

          expect(actual).toStrictEqual(Either.void)
        }),
    )
  })

  describe('with another status code', () => {
    it.effect.prop(
      'returns an error',
      [
        fc.httpClientResponse({
          status: fc.statusCode().filter(status => ![StatusCodes.Accepted, StatusCodes.Created].includes(status)),
        }),
      ],
      ([response]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual.reason).toStrictEqual('StatusCode')
        }),
    )
  })
})
