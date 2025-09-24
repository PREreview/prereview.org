import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../src/career-stage.ts'
import * as fc from './fc.ts'

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
