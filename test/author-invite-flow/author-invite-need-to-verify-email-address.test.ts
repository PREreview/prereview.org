import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as _ from '../../src/author-invite-flow/need-to-verify-email-address-page/index.js'
import type { GetAuthorInviteEnv } from '../../src/author-invite.js'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePublishedMatch,
} from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { Eq as eqOrcid } from '../../src/types/Orcid.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('authorInviteNeedToVerifyEmailAddress', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.unverifiedContactEmailAddress(),
    ])(
      'when the email address needs to be verified',
      async (inviteId, [user, invite], locale, prereview, contactEmailAddress) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
          getAuthorInvite,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
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
      fc.supportedLocale(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.verifiedContactEmailAddress(),
    ])(
      'when the email address is already verified',
      async (inviteId, [user, invite], locale, prereview, contactEmailAddress) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview: () => TE.right(prereview),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when there is no email address', async (inviteId, [user, invite], locale, prereview) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: () => TE.left('not-found'),
        getPrereview: () => TE.right(prereview),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], locale) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      'when the invite cannot be loaded',
      async (inviteId, user, locale) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
          getAuthorInvite: () => TE.left('unavailable'),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
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
      fc.supportedLocale(),
    ])('when the invite is already complete', async (inviteId, [user, invite], locale) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
      })
    })

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.user(), fc.assignedAuthorInvite())
        .filter(([user, invite]) => !eqOrcid.equals(user.orcid, invite.orcid)),
      fc.supportedLocale(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], locale) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.Forbidden,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, locale, invite) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, user, locale, invite) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      'when the invite is not found',
      async (inviteId, user, locale) => {
        const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
          getAuthorInvite: () => TE.left('not-found'),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, locale, invite) => {
      const actual = await _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale })({
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
