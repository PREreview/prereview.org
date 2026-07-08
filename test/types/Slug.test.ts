import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Schema, Tuple } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as _ from '../../src/types/Slug.ts'
import * as fc from '../fc.ts'

describe('SlugSchema', () => {
  describe('decode', () => {
    it.effect.prop(
      'with a slug',
      [fc.slug().map(slug => Tuple.make<[string, string]>(slug, slug))],
      ([[input, expected]]) =>
        Effect.gen(function* () {
          const actual = yield* Schema.decode(_.SlugSchema)(input)

          expect(actual).toStrictEqual(expected)
        }),
      {
        fastCheck: {
          examples: [
            [['foo', 'foo']],
            [['a', 'a']],
            [['abc123', 'abc123']],
            [['foo-bar', 'foo-bar']],
            [['foo-123', 'foo-123']],
            [['123-foo', '123-foo']],
            [['a1-b2-c3', 'a1-b2-c3']],
            [['0', '0']],
            [['z-9', 'z-9']],
            [['001-abc', '001-abc']],
            [['a-very-long-but-still-valid-slug-1234567890', 'a-very-long-but-still-valid-slug-1234567890']],
          ],
        },
      },
    )

    it.prop(
      'with a non-slug',
      [fc.lorem()],
      ([string]) => {
        const actual = Either.mapLeft(Schema.decodeEither(_.SlugSchema)(string), ArrayFormatter.formatErrorSync)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
      {
        fastCheck: {
          examples: [
            ['-'],
            ['Foo'],
            ['foo-'],
            ['foo '],
            ['-foo'],
            ['foo--bar'],
            ['foo_bar'],
            [''],
            [' '],
            ['\t'],
            ['\n'],
            ['FOO'],
            ['Foo-Bar'],
            ['fooBar'],
            ['föö'],
            ['é'],
            ['你好'],
            ['foo.bar'],
            ['foo/bar'],
            ['foo_bar_baz'],
            ['foo@bar'],
            ['--'],
            ['a--'],
            ['--a'],
          ],
        },
      },
    )

    it.prop(
      'with a non-string',
      [fc.anything().filter(value => typeof value !== 'string')],
      ([value]) => {
        const actual = Schema.decodeUnknownEither(_.SlugSchema)(value)

        expect(actual).toStrictEqual(Either.left(expect.anything()))
      },
      {
        fastCheck: {
          examples: [[null], [undefined], [123], [true], [{}], [[]]],
        },
      },
    )
  })

  it.effect.prop('encode', [fc.slug()], ([slug]) =>
    Effect.gen(function* () {
      const actual = yield* Schema.encode(_.SlugSchema)(slug)

      expect(actual).toStrictEqual(slug)
    }),
  )
})
