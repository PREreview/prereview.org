import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/club-details'
import * as fc from './fc'

describe('isLeadFor', () => {
  test.each([
    ['Jessica Polka', '0000-0001-6610-9293' as Orcid, ['asapbio-meta-research']],
    ['Jonathon Coates', '0000-0001-9039-9219' as Orcid, ['asapbio-metabolism']],
  ])('when a lead (%s)', (_name, orcid, expected) => {
    const actual = _.isLeadFor(orcid)

    expect(actual).toStrictEqual(expected)
  })

  test.prop([fc.orcid()])('when not a lead', orcid => {
    const actual = _.isLeadFor(orcid)

    expect(actual).toHaveLength(0)
  })
})
