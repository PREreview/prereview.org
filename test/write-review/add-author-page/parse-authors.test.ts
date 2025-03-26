import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../../src/write-review/add-author-page/parse-authors.js'

describe('parseAuthors', () => {
  test.failing.each([
    ['single', 'Foo Bar foo@example.com', [{ name: 'Foo Bar', emailAddress: 'foo@example.com' }]],
    [
      'multiple',
      'Foo Bar foo@example.com\nBaz Qux baz@example.com',
      [
        { name: 'Foo Bar', emailAddress: 'foo@example.com' },
        { name: 'Baz Qux', emailAddress: 'baz@example.com' },
      ],
    ],
  ])('with valid input (%s)', (_name, input, expected) => {
    const actual = _.parseAuthors(input)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  test.each([
    ['empty', ''],
    ['whitespace only', '       '],
    ['no email address', 'Foo Bar\nBaz Qux'],
    ['multiple email addresses', 'Foo Bar foo@example.com foo2@example.com'],
    ['before and after', 'Foo foo@example.com Bar'],
    ['single reversed', 'foo@example.com Foo Bar'],
    ['multiple different orders', 'foo@example.com, Foo Bar\nbaz@example.com Baz Qux'],
    ['extra whitespace', '   Foo   Bar    \tfoo@example.com    '],
    ['quote marks', '"Foo Bar" foo@example.com'],
    ['comma', 'Foo Bar,foo@example.com'],
  ])('with invalid input (%s)', (_name, input) => {
    const actual = _.parseAuthors(input)

    expect(actual).toStrictEqual(Option.none())
  })
})
