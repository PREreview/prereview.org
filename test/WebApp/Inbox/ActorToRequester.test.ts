import { it } from '@effect/vitest'
import { describe, expect } from 'vitest'
import { EmailAddress, OrcidId, SciProfilesId } from '../../../src/types/index.ts'
import * as _ from '../../../src/WebApp/Inbox/ActorToRequester.ts'
import * as fc from '../../fc.ts'

describe('ActorToRequester', () => {
  describe('when a person', () => {
    it.prop(
      'with an ORCID iD',
      [
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
      ],
      ([[actor, orcidId]]) => {
        const actual = _.ActorToRequester(actor)

        expect(actual).toStrictEqual({ name: actor.name, orcidId, sciProfilesId: undefined, emailAddress: undefined })
      },
    )

    it.prop(
      'with a SciProfiles ID',
      [
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
      ],
      ([[actor, sciProfilesId]]) => {
        const actual = _.ActorToRequester(actor)

        expect(actual).toStrictEqual({ name: actor.name, sciProfilesId, orcidId: undefined, emailAddress: undefined })
      },
    )

    it.prop(
      'with an email address',
      [
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
      ],
      ([[actor, emailAddress]]) => {
        const actual = _.ActorToRequester(actor)

        expect(actual).toStrictEqual({ name: actor.name, emailAddress, orcidId: undefined, sciProfilesId: undefined })
      },
    )
  })

  it.prop(
    'when a non-person',
    [
      fc.record({
        id: fc.url(),
        type: fc.constantFrom('Application', 'Group', 'Organization', 'Service'),
        name: fc.nonEmptyTrimmedString(),
      }),
    ],
    ([actor]) => {
      const actual = _.ActorToRequester(actor)

      expect(actual).toStrictEqual({ name: actor.name })
    },
  )
})
