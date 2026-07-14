import { describe, expect, it, test } from '@effect/vitest'
import * as _ from '../../src/Clubs/ClubDetails.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as fc from '../fc.ts'

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
