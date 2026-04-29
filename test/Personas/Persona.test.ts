import { it } from '@effect/vitest'
import { Struct } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../src/Personas/index.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('match', () => {
  it.prop('PublicPersona', [fc.publicPersona()], ([persona]) => {
    const actual = _.match(persona, { onPublic: Struct.get('orcidId'), onPseudonym: shouldNotBeCalled })

    expect(actual).toStrictEqual(persona.orcidId)
  })

  it.prop('PseudonymPersona', [fc.pseudonymPersona()], ([persona]) => {
    const actual = _.match(persona, { onPublic: shouldNotBeCalled, onPseudonym: Struct.get('pseudonym') })

    expect(actual).toStrictEqual(persona.pseudonym)
  })
})
