import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as O from 'fp-ts/lib/Option.js'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/club-details.js'
import * as fc from './fc.js'

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
    ['Stephen Gabrielson', '0000-0001-9420-4466' as Orcid, ['asapbio-meta-research']],
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
