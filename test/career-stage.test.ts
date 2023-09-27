import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
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

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })

  test.prop([fc.careerStage()])('encode', careerStage => {
    const actual = _.CareerStageC.encode(careerStage)

    expect(actual).toStrictEqual(careerStage)
  })
})
