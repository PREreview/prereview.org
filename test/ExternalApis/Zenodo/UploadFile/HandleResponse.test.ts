import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/Zenodo/UploadFile/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'
import uploadedFile from '../Samples/uploaded-file.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 201 status code', () => {
    test.prop([
      fc.oneof(
        fc.httpClientResponse({
          json: fc.constant(uploadedFile),
          status: fc.constant(StatusCodes.Created),
        }),
        fc.httpClientResponse({
          status: fc.constant(StatusCodes.Created),
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
    test.prop([fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.Created) })])(
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
