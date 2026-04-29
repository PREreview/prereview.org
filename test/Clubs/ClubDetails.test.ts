import { it, test } from '@effect/vitest'
import { Option } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../src/Clubs/ClubDetails.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as fc from '../fc.ts'

describe('getClubByName', () => {
  test.each([
    ['ASAPbio Cancer Biology Crowd', 'asapbio-cancer-biology'],
    ['ASAPbio Neurobiology Crowd', 'asapbio-neurobiology'],
    ['HHMI Transparent and Accountable Peer Review Training Pilot', 'hhmi-training-program'],
    ['HHMI Transparent and Accountable Peer Review Training Program', 'hhmi-training-program'],
  ])('with a club name (%s)', (name, expected) => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  it.prop('with something else', [fc.string()], ([name]) => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(Option.none())
  })
})

describe('isLeadFor', () => {
  test.each([
    ['Jay Patel', OrcidId('0000-0003-1040-3607'), ['asapbio-meta-research']],
    ['Jonathon Coates', OrcidId('0000-0001-9039-9219'), ['asapbio-metabolism']],
  ])('when a lead (%s)', (_name, orcid, expected) => {
    const actual = _.isLeadFor(orcid)

    expect(actual).toStrictEqual(expected)
  })

  it.prop('when not a lead', [fc.orcidId()], ([orcid]) => {
    const actual = _.isLeadFor(orcid)

    expect(actual).toHaveLength(0)
  })
})

describe('isAClubLead', () => {
  test.each([
    ['Jay Patel', OrcidId('0000-0003-1040-3607')],
    ['Jonathon Coates', OrcidId('0000-0001-9039-9219')],
  ])('when a lead (%s)', (_name, orcid) => {
    const actual = _.isAClubLead(orcid)

    expect(actual).toBeTruthy()
  })

  it.prop('when not a lead', [fc.orcidId()], ([orcid]) => {
    const actual = _.isAClubLead(orcid)

    expect(actual).toBeFalsy()
  })
})
