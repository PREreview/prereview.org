import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../src/research-interests.ts'
import * as fc from './fc.ts'

describe('ResearchInterestsC', () => {
  describe('decode', () => {
    test.prop([fc.researchInterests()])('with research interests', string => {
      const actual = _.ResearchInterestsC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    test.prop([fc.anything()])('with non-research interests', value => {
      const actual = _.ResearchInterestsC.decode(value)

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })

  test.prop([fc.researchInterests()])('encode', researchInterests => {
    const actual = _.ResearchInterestsC.encode(researchInterests)

    expect(actual).toStrictEqual(researchInterests)
  })
})
