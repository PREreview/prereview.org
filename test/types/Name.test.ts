import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Schema, Tuple } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as _ from '../../src/types/Name.ts'
import * as fc from '../fc.ts'

describe('NameSchema', () => {
  describe('decode', () => {
    it.effect.prop(
      'with a name',
      [fc.name().map(name => Tuple.make<[string, string]>(name, name))],
      ([[input, expected]]) =>
        Effect.gen(function* () {
          const actual = yield* Schema.decode(_.NameSchema)(input)

          expect(actual).toStrictEqual(expected)
        }),
      {
        fastCheck: {
          examples: [
            [['Josiah Carberry', 'Josiah Carberry']],
            [[' Josiah Carberry ', 'Josiah Carberry']],
            [['\tJosiah\tCarberry\t', 'Josiah Carberry']],
            [['\nJosiah\nCarberry\n', 'Josiah Carberry']],
            [['\t \n  \n\n\t\t  Josiah\t \n  \n\n\t\t  Carberry\t \n  \n\n\t\t  ', 'Josiah Carberry']],
            [['Josiah\fCarberry', 'Josiah Carberry']],
            [['Josiah\u00a0Carberry', 'Josiah Carberry']],
            [['Josiah\u200aCarberry', 'Josiah Carberry']],
          ],
        },
      },
    )

    it.prop('with an empty string', [fc.string({ unit: fc.invisibleCharacter() })], ([string]) => {
      const actual = Either.mapLeft(Schema.decodeEither(_.NameSchema)(string), ArrayFormatter.formatErrorSync)

      expect(actual).toStrictEqual(Either.left([expect.objectContaining({ message: 'string is empty' })]))
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.NameSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.effect.prop('encode', [fc.name()], ([name]) =>
    Effect.gen(function* () {
      const actual = yield* Schema.encode(_.NameSchema)(name)

      expect(actual).toStrictEqual(name)
    }),
  )
})
