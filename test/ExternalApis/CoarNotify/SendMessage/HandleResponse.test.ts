import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/CoarNotify/SendMessage/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'

describe('HandleResponse', () => {
  describe('with an Accepted or Created status code', () => {
    test.prop([
      fc.httpClientResponse({
        status: fc.constantFrom(StatusCodes.Accepted, StatusCodes.Created),
      }),
    ])('returns nothing', response =>
      Effect.gen(function* () {
        const actual = yield* Effect.either(_.HandleResponse(response))

        expect(actual).toStrictEqual(Either.void)
      }).pipe(EffectTest.run),
    )
  })

  describe('with another status code', () => {
    test.prop([
      fc.httpClientResponse({
        status: fc.statusCode().filter(status => ![StatusCodes.Accepted, StatusCodes.Created].includes(status)),
      }),
    ])('returns an error', response =>
      Effect.gen(function* () {
        const actual = yield* Effect.flip(_.HandleResponse(response))

        expect(actual.reason).toStrictEqual('StatusCode')
      }).pipe(EffectTest.run),
    )
  })
})
