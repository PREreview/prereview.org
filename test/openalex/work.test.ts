import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/openalex/work'
import * as fc from './fc'

describe('getFields', () => {
  test.prop([
    fc.tuple(fc.url(), fc.url()).chain(urls =>
      fc.tuple(
        fc.work({
          topics: fc.constant([{ field: { id: urls[0] } }, { field: { id: urls[1] } }, { field: { id: urls[0] } }]),
        }),
        fc.constant(urls),
      ),
    ),
  ])('removes duplicates', ([work, expected]) => {
    const actual = _.getFields(work)

    expect(actual).toStrictEqual(expected)
  })
})
