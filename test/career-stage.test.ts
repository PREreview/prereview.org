import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as D from 'io-ts/Decoder'
import * as _ from '../src/career-stage'
import * as fc from './fc'

describe('CareerStageC', () => {
  describe('decode', () => {
    test.prop([fc.careerStage()])('with a career stage', string => {
      const actual = _.CareerStageC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.anything()])('with a non-career stage', value => {
      const actual = _.CareerStageC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, '"early" | "mid" | "late"'))
    })
  })

  test.prop([fc.careerStage()])('encode', careerStage => {
    const actual = _.CareerStageC.encode(careerStage)

    expect(actual).toStrictEqual(careerStage)
  })
})
