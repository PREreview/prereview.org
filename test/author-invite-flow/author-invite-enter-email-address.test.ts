import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow/enter-email-address-page'
import type { GetContactEmailAddressEnv } from '../../src/contact-email-address'
import {
  authorInviteCheckMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
} from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInviteEnterEmailAddress', () => {
  describe('when the user is logged in', () => {
    describe('when the form is submitted', () => {
      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.oneof(
          fc.record(
            { useInvitedAddress: fc.constant('yes'), otherEmailAddress: fc.anything() },
            { requiredKeys: ['useInvitedAddress'] },
          ),
          fc.record({ useInvitedAddress: fc.constant('no'), otherEmailAddress: fc.emailAddress() }),
        ),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
      ])('when the form is valid', async (inviteId, [user, invite], body, prereview, contactEmailAddress) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.fromEither(contactEmailAddress),
        )
        const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method: 'POST', user })({
          getAuthorInvite,
          getContactEmailAddress,
          getPrereview,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      })

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.oneof(
          fc.record(
            { useInvitedAddress: fc.constant('no'), otherEmailAddress: fc.anything() },
            { requiredKeys: ['useInvitedAddress'] },
          ),
          fc.record({ useInvitedAddress: fc.anything().filter(value => value !== 'yes' && value !== 'no') }),
          fc.anything(),
        ),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
      ])('when the form is invalid', async (inviteId, [user, invite], body, prereview, contactEmailAddress) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method: 'POST', user })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPrereview: () => TE.right(prereview),
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
          status: Status.BadRequest,
          title: expect.stringContaining('Error: Contact details'),
          main: expect.stringContaining('Contact details'),
          skipToLabel: 'form',
          js: ['conditional-inputs.js', 'error-summary.js'],
        })
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string().filter(method => method !== 'POST'),
      fc.anything(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
    ])(
      'when the form needs submitting',
      async (inviteId, [user, invite], method, body, prereview, contactEmailAddress) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          getAuthorInvite,
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPrereview,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
          status: Status.OK,
          title: expect.stringContaining('Contact details'),
          main: expect.stringContaining('Contact details'),
          skipToLabel: 'form',
          js: ['conditional-inputs.js'],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string(),
      fc.anything(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.verifiedContactEmailAddress(),
    ])(
      'when the email address is already verified',
      async (inviteId, [user, invite], method, body, prereview, contactEmailAddress) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview: () => TE.right(prereview),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string(),
      fc.anything(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], method, body) => {
      const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.anything()])(
      'when the invite cannot be loaded',
      async (inviteId, user, method, body) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          getAuthorInvite: () => TE.left('unavailable'),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.string(),
      fc.anything(),
    ])('when the invite is already complete', async (inviteId, [user, invite], method, body) => {
      const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.user(), fc.assignedAuthorInvite())
        .filter(([user, invite]) => !eqOrcid.equals(user.orcid, invite.orcid)),
      fc.string(),
      fc.anything(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], method, body) => {
      const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.Forbidden,
        title: expect.stringContaining('do not have permission'),
        main: expect.stringContaining('do not have permission'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.anything(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, method, body, invite) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.anything()])(
      'when the invite is not found',
      async (inviteId, user, method, body) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          getAuthorInvite: () => TE.left('not-found'),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.uuid(), fc.string(), fc.anything(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, method, body, invite) => {
      const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInviteMatch.formatter, { id: inviteId }),
      })
    },
  )
})
