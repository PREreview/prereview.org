import { describe, expect, it } from '@effect/vitest'
import * as _ from '../../../../src/ExternalInteractions/OpenAlexWorks/GetCategories/CategoriesFromWork.ts'
import * as fc from '../../../fc.ts'

describe('CategoriesFromWork', () => {
  it.prop(
    'removes duplicates',
    [
      fc
        .uniqueArray(fc.record({ id: fc.url(), display_name: fc.string() }), {
          minLength: 8,
          maxLength: 8,
          selector: record => record.id.href,
        })
        .chain(categories =>
          fc.tuple(
            fc.openAlexWork({
              topics: fc.constant([
                { ...categories[0]!, subfield: categories[1]!, field: categories[2]!, domain: categories[3]! },
                { ...categories[0]!, subfield: categories[4]!, field: categories[2]!, domain: categories[3]! },
                { ...categories[5]!, subfield: categories[1]!, field: categories[6]!, domain: categories[7]! },
              ]),
            }),
            fc.constant(categories),
          ),
        ),
    ],
    ([[work, expected]]) => {
      const actual = _.CategoriesFromWork(work)

      expect(actual).toStrictEqual(expected)
    },
  )
})
