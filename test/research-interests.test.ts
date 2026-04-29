import { it } from '@effect/vitest'
import * as E from 'fp-ts/lib/Either.js'
import * as D from 'io-ts/lib/Decoder.js'
import { describe, expect } from 'vitest'
import * as _ from '../src/research-interests.ts'
import * as fc from './fc.ts'

describe('ResearchInterestsC', () => {
  describe('decode', () => {
    it.prop('with research interests', [fc.researchInterests()], ([string]) => {
      const actual = _.ResearchInterestsC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    it.prop('with non-research interests', [fc.anything()], ([value]) => {
      const actual = _.ResearchInterestsC.decode(value)

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.researchInterests()], ([researchInterests]) => {
    const actual = _.ResearchInterestsC.encode(researchInterests)

    expect(actual).toStrictEqual(researchInterests)
  })
})
