import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/DetectLanguage/Detect/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      test.prop([
        fc.httpClientResponse({
          body: fc.fileInDirectory('test/ExternalApis/DetectLanguage/DetectSamples'),
          status: fc.constant(StatusCodes.OK),
        }),
      ])('decodes the response', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.either(_.HandleResponse(response))

          expect(actual).toStrictEqual(Either.right(expect.anything()))
        }).pipe(EffectTest.run),
      )
    })

    describe('with an unknown JSON body', () => {
      test.prop([
        fc.httpClientResponse({
          json: fc.json().filter(json => !Array.isArray(json) || json.length > 0),
          status: fc.constant(StatusCodes.OK),
        }),
      ])('returns an error', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('DetectLanguageIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'ParseError' })
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

          expect(actual._tag).toStrictEqual('DetectLanguageIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'Decode', response })
        }).pipe(EffectTest.run),
      )
    })
  })

  describe('with another status code', () => {
    test.prop([
      fc.httpClientResponse({
        status: fc.statusCode().filter(status => ![StatusCodes.OK].includes(status)),
      }),
    ])('returns an error', response =>
      Effect.gen(function* () {
        const actual = yield* Effect.flip(_.HandleResponse(response))

        expect(actual._tag).toStrictEqual('DetectLanguageIsUnavailable')
        expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'StatusCode', response })
      }).pipe(EffectTest.run),
    )
  })
})
