import { describe, expect, it } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Array, Either, Schema } from 'effect'
import * as _ from '../../../src/WebApp/Response/Http.ts'
import * as fc from '../../fc.ts'

describe('LinkHeaderSchema', () => {
  it.prop(
    'decode',
    [fc.anything()],
    ([value]) => {
      const actual = Schema.decodeUnknownEither(_.LinkHeaderSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    },
    {
      fastCheck: {
        examples: [
          ['<http://example.com/>; rel="canonical"'],
          [
            '<https://api.github.com/user/9287/repos?page=3&per_page=100>; rel="next", <https://api.github.com/user/9287/repos?page=1&per_page=100>; rel="prev"; pet="cat", <https://api.github.com/user/9287/repos?page=5&per_page=100>; rel="last"',
          ],
        ],
      },
    },
  )

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
