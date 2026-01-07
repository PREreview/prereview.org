import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../../../src/WebApp/write-review/add-author-page/parse-authors.ts'

describe('parseAuthors', () => {
  test.each([
    ['single', 'Foo Bar foo@example.com', [{ name: 'Foo Bar', emailAddress: 'foo@example.com' }]],
    ['single reversed', 'foo@example.com Foo Bar', [{ name: 'Foo Bar', emailAddress: 'foo@example.com' }]],
    [
      'multiple',
      'Foo Bar foo@example.com\nBaz Qux baz@example.com',
      [
        { name: 'Foo Bar', emailAddress: 'foo@example.com' },
        { name: 'Baz Qux', emailAddress: 'baz@example.com' },
      ],
    ],
    [
      'multiple different orders',
      'foo@example.com Foo Bar\nBaz Qux baz@example.com',
      [
        { name: 'Foo Bar', emailAddress: 'foo@example.com' },
        { name: 'Baz Qux', emailAddress: 'baz@example.com' },
      ],
    ],
    [
      'extra whitespace',
      '  \n\n Foo   Bar    \tfoo@example.com    \n\tBaz\tQux    \t   baz@example.com\t',
      [
        { name: 'Foo Bar', emailAddress: 'foo@example.com' },
        { name: 'Baz Qux', emailAddress: 'baz@example.com' },
      ],
    ],
    ['comma', 'Foo Bar,foo@example.com', [{ name: 'Foo Bar', emailAddress: 'foo@example.com' }]],
    [
      'multiple commas',
      ',,,,,,,Foo,Bar,,,,foo@example.com,,\n,',
      [{ name: 'Foo Bar', emailAddress: 'foo@example.com' }],
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
    ['quote marks', '"Foo Bar" foo@example.com'],
  ])('with invalid input (%s)', (_name, input) => {
    const actual = _.parseAuthors(input)

    expect(actual).toStrictEqual(Option.none())
  })
})
