import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as O from 'fp-ts/Option'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/club-details'
import * as fc from './fc'

describe('getClubByName', () => {
  test.each([
    ['ASAPbio Cancer Biology Crowd', 'asapbio-cancer-biology'],
    ['ASAPbio Neurobiology Crowd', 'asapbio-neurobiology'],
  ])('with a club name (%s)', (name, expected) => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(O.some(expected))
  })

  test.prop([fc.string()])('with something else', name => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(O.none)
  })
})

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
