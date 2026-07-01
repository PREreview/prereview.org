import { describe, expect, it, test } from '@effect/vitest'
import { Option } from 'effect'
import * as _ from '../../src/Clubs/ClubDetails.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as fc from '../fc.ts'

describe('getClubByName', () => {
  test.each([
    [Name('ASAPbio Cancer Biology Crowd'), 'asapbio-cancer-biology'],
    [Name('ASAPbio Neurobiology Crowd'), 'asapbio-neurobiology'],
    [Name('HHMI Transparent and Accountable Peer Review Training Pilot'), 'hhmi-training-program'],
    [Name('HHMI Transparent and Accountable Peer Review Training Program'), 'hhmi-training-program'],
  ])('with a club name (%s)', (name, expected) => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  it.prop('with something else', [fc.name()], ([name]) => {
    const actual = _.getClubByName(name)

    expect(actual).toStrictEqual(Option.none())
  })
})

describe('getClubBySlug', () => {
  test.each([
    [Name('asapbio-cancer-biology'), 'asapbio-cancer-biology'],
    [Name('asapbio-neurobiology'), 'asapbio-neurobiology'],
    [Name('hhmi-training-program'), 'hhmi-training-program'],
  ])('with a club slug (%s)', (slug, expected) => {
    const actual = _.getClubBySlug(slug)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  it.prop('with something else', [fc.name()], ([slug]) => {
    const actual = _.getClubBySlug(slug)

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
