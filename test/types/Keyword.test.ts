import { describe, expect, it } from '../vitest.ts'
import * as _ from '../../src/types/Keyword.ts'
import * as fc from '../fc.ts'

describe('isKeywordId', () => {
  it.prop('with a keyword ID', [fc.keywordId()], ([id]) => {
    expect(_.isKeywordId(id)).toBe(true)
  })

  it.prop(
    'with something else',
    [fc.string().filter(value => !(_.keywordIds as ReadonlyArray<string>).includes(value))],
    ([value]) => {
      expect(_.isKeywordId(value)).toBe(false)
    },
  )
})
