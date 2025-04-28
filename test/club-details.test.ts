import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../src/club-details.js'
import * as fc from './fc.js'

describe('getClubByName', () => {
  test.each([
    ['ASAPbio Cancer Biology Crowd', 'asapbio-cancer-biology'],
    ['ASAPbio Neurobiology Crowd', 'asapbio-neurobiology'],
  ])('with a club name (%s)', (name, expected) => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  test.prop([fc.string()])('with something else', name => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(Option.none())
  })
})

describe('isLeadFor', () => {
  test.each([
    ['Stephen Gabrielson', Orcid('0000-0001-9420-4466'), ['asapbio-meta-research']],
    ['Jonathon Coates', Orcid('0000-0001-9039-9219'), ['asapbio-metabolism']],
  ])('when a lead (%s)', (_name, orcid, expected) => {
    const actual = _.isLeadFor(orcid)

    expect(actual).toStrictEqual(expected)
  })

  test.prop([fc.orcid()])('when not a lead', orcid => {
    const actual = _.isLeadFor(orcid)

    expect(actual).toHaveLength(0)
  })
})

describe('isAClubLead', () => {
  test.each([
    ['Stephen Gabrielson', Orcid('0000-0001-9420-4466')],
    ['Jonathon Coates', Orcid('0000-0001-9039-9219')],
  ])('when a lead (%s)', (_name, orcid) => {
    const actual = _.isAClubLead(orcid)

    expect(actual).toBeTruthy()
  })

  test.prop([fc.orcid()])('when not a lead', orcid => {
    const actual = _.isAClubLead(orcid)

    expect(actual).toBeFalsy()
  })
})
