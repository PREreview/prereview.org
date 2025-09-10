import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Struct } from 'effect'
import * as _ from '../../src/Personas/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('match', () => {
  test.prop([fc.publicPersona()])('PublicPersona', persona => {
    const actual = _.match(persona, { onPublic: Struct.get('orcidId'), onPseudonym: shouldNotBeCalled })

    expect(actual).toStrictEqual(persona.orcidId)
  })

  test.prop([fc.pseudonymPersona()])('PseudonymPersona', persona => {
    const actual = _.match(persona, { onPublic: shouldNotBeCalled, onPseudonym: Struct.get('pseudonym') })

    expect(actual).toStrictEqual(persona.pseudonym)
  })
})
