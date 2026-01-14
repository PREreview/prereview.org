import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { EmailAddress, OrcidId, SciProfilesId } from '../../../src/types/index.ts'
import * as _ from '../../../src/WebApp/Inbox/ActorToRequester.ts'
import * as fc from '../../fc.ts'

describe('ActorToRequester', () => {
  describe('when a person', () => {
    test.prop([
      fc.orcidId().chain(orcidId =>
        fc.tuple(
          fc.record({
            id: fc.constant(OrcidId.toUrl(orcidId)),
            type: fc.constant('Person'),
            name: fc.nonEmptyTrimmedString(),
          }),
          fc.constant(orcidId),
        ),
      ),
    ])('with an ORCID iD', ([actor, orcidId]) => {
      const actual = _.ActorToRequester(actor)

      expect(actual).toStrictEqual({ name: actor.name, orcidId, sciProfilesId: undefined, emailAddress: undefined })
    })

    test.prop([
      fc.sciProfilesId().chain(sciProfilesId =>
        fc.tuple(
          fc.record({
            id: fc.constant(SciProfilesId.toUrl(sciProfilesId)),
            type: fc.constant('Person'),
            name: fc.nonEmptyTrimmedString(),
          }),
          fc.constant(sciProfilesId),
        ),
      ),
    ])('with a SciProfiles ID', ([actor, sciProfilesId]) => {
      const actual = _.ActorToRequester(actor)

      expect(actual).toStrictEqual({ name: actor.name, sciProfilesId, orcidId: undefined, emailAddress: undefined })
    })

    test.prop([
      fc.emailAddress().chain(emailAddress =>
        fc.tuple(
          fc.record({
            id: fc.constant(EmailAddress.toUrl(emailAddress)),
            type: fc.constant('Person'),
            name: fc.nonEmptyTrimmedString(),
          }),
          fc.constant(emailAddress),
        ),
      ),
    ])('with an email address', ([actor, emailAddress]) => {
      const actual = _.ActorToRequester(actor)

      expect(actual).toStrictEqual({ name: actor.name, emailAddress, orcidId: undefined, sciProfilesId: undefined })
    })
  })

  test.prop([
    fc.record({
      id: fc.url(),
      type: fc.constantFrom('Application', 'Group', 'Organization', 'Service'),
      name: fc.nonEmptyTrimmedString(),
    }),
  ])('when a non-person', actor => {
    const actual = _.ActorToRequester(actor)

    expect(actual).toStrictEqual({ name: actor.name })
  })
})
