import { describe, expect, it } from '@effect/vitest'
import { Struct } from 'effect'
import * as _ from '../../src/Prereviewers/index.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

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
