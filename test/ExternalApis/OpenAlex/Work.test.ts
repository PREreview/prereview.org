import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../../src/ExternalApis/OpenAlex/Work.ts'
import * as fc from './fc.ts'

describe('getCategories', () => {
  test.prop([
    fc
      .uniqueArray(fc.record({ id: fc.url(), display_name: fc.string() }), {
        minLength: 8,
        maxLength: 8,
        selector: record => record.id.href,
      })
      .chain(categories =>
        fc.tuple(
          fc.work({
            topics: fc.constant([
              { ...categories[0]!, subfield: categories[1]!, field: categories[2]!, domain: categories[3]! },
              { ...categories[0]!, subfield: categories[4]!, field: categories[2]!, domain: categories[3]! },
              { ...categories[5]!, subfield: categories[1]!, field: categories[6]!, domain: categories[7]! },
            ]),
          }),
          fc.constant(categories),
        ),
      ),
  ])('removes duplicates', ([work, expected]) => {
    const actual = _.getCategories(work)

    expect(actual).toStrictEqual(expected)
  })
})
