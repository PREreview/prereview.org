import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Either, Schema } from 'effect'
import * as _ from '../../../src/WebApp/Response/Http.ts'
import * as fc from '../../fc.ts'

describe('LinkHeaderSchema', () => {
  test.prop([fc.anything()], {
    examples: [
      ['<http://example.com/>; rel="canonical"'],
      [
        '<https://api.github.com/user/9287/repos?page=3&per_page=100>; rel="next", <https://api.github.com/user/9287/repos?page=1&per_page=100>; rel="prev"; pet="cat", <https://api.github.com/user/9287/repos?page=5&per_page=100>; rel="last"',
      ],
    ],
  })('decode', value => {
    const actual = Schema.decodeUnknownEither(_.LinkHeaderSchema)(value)

    expect(actual).toStrictEqual(Either.left(expect.anything()))
  })

  test.each([
    ['<http://example.com/>; rel="canonical"', Array.of({ uri: 'http://example.com/', rel: 'canonical' })],
    [
      '<https://api.github.com/user/9287/repos?page=3&per_page=100>; rel="next", <https://api.github.com/user/9287/repos?page=1&per_page=100>; rel="prev"; pet="cat", <https://api.github.com/user/9287/repos?page=5&per_page=100>; rel="last"',
      [
        {
          uri: 'https://api.github.com/user/9287/repos?page=3&per_page=100',
          rel: 'next',
        },
        {
          uri: 'https://api.github.com/user/9287/repos?page=1&per_page=100',
          pet: 'cat',
          rel: 'prev',
        },
        {
          rel: 'last',
          uri: 'https://api.github.com/user/9287/repos?page=5&per_page=100',
        },
      ] satisfies Array.NonEmptyArray<unknown>,
    ],
  ])('encode (%s)', (expected, input) => {
    const actual = Schema.encodeSync(_.LinkHeaderSchema)(input)

    expect(actual).toStrictEqual(expected)
  })
})
