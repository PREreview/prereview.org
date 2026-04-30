import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Schema } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../../src/types/Pseudonym.ts'
import * as fc from '../fc.ts'

describe('PseudonymC', () => {
  describe('decode', () => {
    it.prop('with a pseudonym', [fc.pseudonym()], ([string]) => {
      const actual = _.PseudonymC.decode(string)

      expect(actual).toStrictEqual(D.success(string))
    })

    it.prop('with a non-pseudonym', [fc.string()], ([string]) => {
      const actual = _.PseudonymC.decode(string)

      expect(actual).toStrictEqual(D.failure(string, 'Pseudonym'))
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = _.PseudonymC.decode(value)

      expect(actual).toStrictEqual(D.failure(value, 'string'))
    })
  })

  it.prop('encode', [fc.pseudonym()], ([pseudonym]) => {
    const actual = _.PseudonymC.encode(pseudonym)

    expect(actual).toStrictEqual(pseudonym)
  })
})

describe('PseudonymSchema', () => {
  describe('decode', () => {
    it.prop('with a pseudonym', [fc.pseudonym()], ([string]) => {
      const actual = Schema.decodeSync(_.PseudonymSchema)(string)

      expect(actual).toStrictEqual(string)
    })

    it.prop('with a non-pseudonym', [fc.string()], ([string]) => {
      const actual = Either.mapLeft(Schema.decodeEither(_.PseudonymSchema)(string), ArrayFormatter.formatErrorSync)

      expect(actual).toStrictEqual(
        Either.left([
          expect.objectContaining({ message: expect.stringMatching(/^(?:not a pseudonym|string is empty)$/) }),
        ]),
      )
    })

    it.prop('with a non-string', [fc.anything().filter(value => typeof value !== 'string')], ([value]) => {
      const actual = Schema.decodeUnknownEither(_.PseudonymSchema)(value)

      expect(actual).toStrictEqual(Either.left(expect.anything()))
    })
  })

  it.prop('encode', [fc.pseudonym()], ([pseudonym]) => {
    const actual = Schema.encodeSync(_.PseudonymSchema)(pseudonym)

    expect(actual).toStrictEqual(pseudonym)
  })
})

describe('isPseudonym', () => {
  it.prop(
    'with a pseudonym',
    [fc.pseudonym()],
    ([string]) => {
      expect(_.isPseudonym(string)).toBe(true)
    },
    {
      fastCheck: {
        examples: [
          ['Orange Panda' as _.Pseudonym],
          ['Orange Panda 0' as _.Pseudonym],
          ['Orange Panda 1' as _.Pseudonym],
          ['Orange Panda 123' as _.Pseudonym],
          ['Green Hawk' as _.Pseudonym],
          ['Blue Sheep' as _.Pseudonym],
          ['Red Hummingbird' as _.Pseudonym],
          ['White Frog' as _.Pseudonym],
          ['Pink Jellyfish' as _.Pseudonym],
          ['Sapphire Kangaroo' as _.Pseudonym],
          ['Black Dog' as _.Pseudonym],
        ],
      },
    },
  )

  it.prop(
    'with a non-pseudonym',
    [fc.lorem()],
    ([string]) => {
      expect(_.isPseudonym(string)).toBe(false)
    },
    {
      fastCheck: {
        examples: [
          ['Orange panda'],
          ['orange panda'],
          ['ORANGE PANDA'],
          ['Giant Panda'],
          ['Giant Panda 1'],
          ['OrangePanda'],
          ['OrangePanda1'],
          ['Orange  Panda'],
          [' Orange Panda'],
          ['Orange Panda '],
          ['Orange  Panda 1'],
          ['Orange Panda Bear'],
          ['Orange Panda 1 Bear'],
          ['Orange Panda -1'],
          ['Orange Panda One'],
          ['Orange Panda 1!'],
          ['Orange Panda 1 !'],
          ['Orange Panda 01'],
          ['Orange Panda 1.0'],
        ],
      },
    },
  )
})

describe('possiblePseudonyms', () => {
  const result = Effect.runSync(_.possiblePseudonyms)

  it('does not allow Amthyst', () => {
    expect(result).not.toContain('Amthyst Panda')
  })

  it('contains all combinations of colors and animals', () => {
    expect(result.size).toStrictEqual((72 - 1) * 89)
  })
})
