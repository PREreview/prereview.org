import { describe, expect, it } from '@effect/vitest'
import * as E from 'fp-ts/lib/Either.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../src/career-stage.ts'
import * as fc from './fc.ts'

describe('CareerStageC', () => {
  describe('decode', () => {
    it.prop('with a career stage', [fc.careerStage()], ([string]) => {
      const actual = _.CareerStageC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    it.prop('with a non-career stage', [fc.anything()], ([value]) => {
      const actual = _.CareerStageC.decode(value)

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.careerStage()], ([careerStage]) => {
    const actual = _.CareerStageC.encode(careerStage)

    expect(actual).toStrictEqual(careerStage)
  })
})
