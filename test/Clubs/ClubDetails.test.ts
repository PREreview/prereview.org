import { describe, expect, it, test } from '@effect/vitest'
import { Option } from 'effect'
import * as _ from '../../src/Clubs/ClubDetails.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as fc from '../fc.ts'

describe('getClubByName', () => {
  test.each([
    [Name('ASAPbio Cancer Biology Crowd'), '13e21570-0d1a-47f0-b378-b8c20776496a'],
    [Name('ASAPbio Neurobiology Crowd'), '317d0a13-5a10-44fc-9bcd-fb548e01e9cb'],
    [Name('HHMI Transparent and Accountable Peer Review Training Pilot'), '206ef17f-c5f3-44d3-acee-ba9b1f8299e9'],
    [Name('HHMI Transparent and Accountable Peer Review Training Program'), '206ef17f-c5f3-44d3-acee-ba9b1f8299e9'],
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
    [Name('asapbio-cancer-biology'), '13e21570-0d1a-47f0-b378-b8c20776496a'],
    [Name('asapbio-neurobiology'), '317d0a13-5a10-44fc-9bcd-fb548e01e9cb'],
    [Name('hhmi-training-program'), '206ef17f-c5f3-44d3-acee-ba9b1f8299e9'],
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
    ['Jay Patel', OrcidId('0000-0003-1040-3607'), ['901dba75-ecad-41b8-92b0-1aab56a96e54']],
    ['Jonathon Coates', OrcidId('0000-0001-9039-9219'), ['3e820d44-fdb3-4cba-aeb6-ac03fb23108e']],
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
