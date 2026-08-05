import { describe, expect, it } from '@effect/vitest'
import { Option, Struct } from 'effect'
import * as _ from '../../src/Prereviewers/index.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('PublicPersona', () => {
  describe('displayName', () => {
    it.prop(
      'with a name',
      [
        fc
          .name()
          .chain(name => fc.tuple(fc.constant(name), fc.publicPersona({ name: fc.constant(Option.some(name)) }))),
      ],
      ([[expected, persona]]) => {
        const actual = persona.displayName

        expect(actual).toStrictEqual(expected)
      },
    )

    it.prop('without a name', [fc.publicPersona({ name: fc.constant(Option.none()) })], ([persona]) => {
      const actual = persona.displayName

      expect(actual).toStrictEqual(persona.orcidId)
    })
  })
})

describe('match', () => {
  it.prop('PublicPersona', [fc.publicPersona()], ([persona]) => {
    const actual = _.matchPersona(persona, { onPublic: Struct.get('orcidId'), onPseudonym: shouldNotBeCalled })

    expect(actual).toStrictEqual(persona.orcidId)
  })

  it.prop('PseudonymPersona', [fc.pseudonymPersona()], ([persona]) => {
    const actual = _.matchPersona(persona, { onPublic: shouldNotBeCalled, onPseudonym: Struct.get('pseudonym') })

    expect(actual).toStrictEqual(persona.pseudonym)
  })
})

describe('getPersonaName', () => {
  it.prop('PublicPersona', [fc.publicPersona()], ([persona]) => {
    const actual = _.getPersonaName(persona)

    expect(actual).toStrictEqual(persona.name)
  })

  it.prop('PseudonymPersona', [fc.pseudonymPersona()], ([persona]) => {
    const actual = _.getPersonaName(persona)

    expect(actual).toStrictEqual(Option.some(persona.pseudonym))
  })
})
