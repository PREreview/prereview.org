import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as _ from '../../src/types/Keyword.ts'

test.each<[string, ReadonlyArray<_.KeywordId>]>([
  [
    'airway',
    [
      '396a9c50c414cf8edfac',
      'c166d071cd2188f39720',
      'ad685bcab5c1faea2491',
      '0d6529e00c99c0b5be93',
      '532ec18b843dd624ebd6',
      'a38cb730bfaf001ab1ea',
      'c1764b173585411e7a52',
      'a876c85ba26da382cc22',
      'a597026c10951cdcf7e6',
      '0b11ede7627fd3b6088c',
    ],
  ],
  ["Green's function for the three-variable Laplace equation", ['6caac7a3737b6387010f']],
  ['asfipsaofiosfjosafjsaoif', []],
])('search (%s)', (search, expected) => {
  const actual = _.search(search)

  expect(actual).toStrictEqual(expected)
})
