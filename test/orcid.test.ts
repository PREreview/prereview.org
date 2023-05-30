import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/orcid'
import * as fc from './fc'

describe('getNameFromOrcid', () => {
  test('when the ORCID iD is 0000-0002-6109-0367', async () => {
    const actual = await _.getNameFromOrcid('0000-0002-6109-0367' as Orcid)()

    expect(actual).toStrictEqual(E.right('Daniela Saderi'))
  })

  test.prop([fc.orcid().filter(orcid => orcid !== '0000-0002-6109-0367')])(
    'when the ORCID iD is 0000-0002-6109-0367',
    async orcid => {
      const actual = await _.getNameFromOrcid(orcid)()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )
})
