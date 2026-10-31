import { describe, expect, it } from '../vitest.ts'
import { Effect, Result, Schema, Tuple, SchemaIssue } from 'effect'
import * as _ from '../../src/types/Name.ts'
import * as fc from '../fc.ts'

const formatError = (error: Schema.SchemaError) => SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues

describe('NameSchema', () => {
  describe('decode', () => {
    it.effect.prop(
      'with a name',
      [fc.name().map(name => Tuple.make<[string, string]>(name, name))],
      ([[input, expected]]) =>
        Effect.gen(function* () {
          const actual = yield* Schema.decodeEffect(_.NameSchema)(input)

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
      const actual = Result.mapError(Schema.decodeResult(_.NameSchema)(string), formatError)

      expect(actual).toStrictEqual(Result.fail([expect.objectContaining({ message: 'string is empty' })]))
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownResult(_.NameSchema)(value)

      expect(actual).toStrictEqual(Result.fail(expect.anything()))
    })
  })

  it.effect.prop('encode', [fc.name()], ([name]) =>
    Effect.gen(function* () {
      const actual = yield* Schema.encodeEffect(_.NameSchema)(name)

      expect(actual).toStrictEqual(name)
    }),
  )
})
