import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow/need-to-verify-email-address-page'
import {
  authorInviteCheckMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePublishedMatch,
} from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInviteNeedToVerifyEmailAddress', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.unverifiedContactEmailAddress(),
    ])(
      'when the email address needs to be verified',
      async (inviteId, [user, invite], prereview, contactEmailAddress) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
          getAuthorInvite,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
          status: Status.OK,
          title: expect.stringContaining('Verify'),
          main: expect.stringContaining('open the email'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.verifiedContactEmailAddress(),
    ])(
      'when the email address is already verified',
      async (inviteId, [user, invite], prereview, contactEmailAddress) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when there is no email address', async (inviteId, [user, invite], prereview) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: () => TE.left('not-found'),
        getPrereview: () => TE.right(prereview),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
    ])('when the review cannot be loaded', async (inviteId, [user, invite]) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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

    test.prop([fc.uuid(), fc.user()])('when the invite cannot be loaded', async (inviteId, user) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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
    })

    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
    ])('when the invite is already complete', async (inviteId, [user, invite]) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite]) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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

    test.prop([fc.uuid(), fc.user(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, invite) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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

    test.prop([fc.uuid(), fc.user()])('when the invite is not found', async (inviteId, user) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, user })({
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
    })
  })

  test.prop([fc.uuid(), fc.authorInvite()])('when the user is not logged in', async (inviteId, invite) => {
    const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId })({
      getAuthorInvite: () => TE.right(invite),
      getContactEmailAddress: shouldNotBeCalled,
      getPrereview: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(authorInviteMatch.formatter, { id: inviteId }),
    })
  })
})
