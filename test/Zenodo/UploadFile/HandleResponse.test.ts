import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as _ from '../../../src/Zenodo/UploadFile/HandleResponse.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../fc.js'
import uploadedFile from '../Samples/uploaded-file.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 201 status code', () => {
    test.prop([
      fc.oneof(
        fc.httpClientResponse({
          json: fc.constant(uploadedFile),
          status: fc.constant(StatusCodes.CREATED),
        }),
        fc.httpClientResponse({
          status: fc.constant(StatusCodes.CREATED),
        }),
      ),
    ])('return nothing', response =>
      Effect.gen(function* () {
        const actual = yield* Effect.either(_.HandleResponse(response))

        expect(actual).toStrictEqual(Either.void)
      }).pipe(EffectTest.run),
    )
  })

  describe('with another status code', () => {
    test.prop([fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.CREATED) })])(
      'returns an error',
      response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('ResponseError')
          expect(actual.reason).toStrictEqual('StatusCode')
        }).pipe(EffectTest.run),
    )
  })
})
