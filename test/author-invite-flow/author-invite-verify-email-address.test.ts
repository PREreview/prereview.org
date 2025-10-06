import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as _ from '../../src/author-invite-flow/verify-email-address.ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite.ts'
import {
  VerifiedContactEmailAddress,
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
} from '../../src/contact-email-address.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteVerifyEmailAddressMatch,
} from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../src/types/OrcidId.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('authorInviteVerifyEmailAddress', () => {
  describe('when the user is logged in', () => {
    describe('when the email address needs to be verified', () => {
      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc
          .unverifiedContactEmailAddress()
          .map(contactEmailAddress => [contactEmailAddress, contactEmailAddress.verificationToken] as const),
      ])(
        'when the email address can be verified',
        async (inviteId, [user, invite], locale, prereview, [contactEmailAddress, verifyToken]) => {
          const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
            TE.right(undefined),
          )

          const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress,
          })()

          expect(actual).toStrictEqual({
            _tag: 'FlashMessageResponse',
            location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
            message: 'contact-email-verified',
          })
          expect(saveContactEmailAddress).toHaveBeenCalledWith(
            user.orcid,
            new VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
          )
        },
      )

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc
          .tuple(fc.unverifiedContactEmailAddress(), fc.uuid())
          .filter(([contactEmailAddress, verifyToken]) => contactEmailAddress.verificationToken !== verifyToken),
      ])(
        "when the token doesn't match",
        async (inviteId, [user, invite], locale, prereview, [contactEmailAddress, verifyToken]) => {
          const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress: shouldNotBeCalled,
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

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc
          .unverifiedContactEmailAddress()
          .map(contactEmailAddress => [contactEmailAddress, contactEmailAddress.verificationToken] as const),
      ])(
        "when the email address can't be verified",
        async (inviteId, [user, invite], locale, prereview, [contactEmailAddress, verifyToken]) => {
          const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
            TE.left('unavailable'),
          )

          const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveContactEmailAddress).toHaveBeenCalledWith(
            user.orcid,
            new VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
          )
        },
      )
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.uuid(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
      fc.verifiedContactEmailAddress(),
    ])(
      'when the email address is already verified',
      async (inviteId, [user, invite], locale, verifyToken, prereview, contactEmailAddress) => {
        const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.right(contactEmailAddress),
        )

        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress,
          getPrereview: () => TE.right(prereview),
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.uuid(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when there is no email address', async (inviteId, [user, invite], locale, verifyToken, prereview) => {
      const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
        TE.left('not-found'),
      )

      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress,
        getPrereview: () => TE.right(prereview),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.uuid(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], locale, verifyToken) => {
      const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.left('unavailable'))

      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview,
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid()])(
      'when the invite cannot be loaded',
      async (inviteId, user, locale, verifyToken) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('unavailable'))

        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
          getAuthorInvite,
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      },
    )

    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.supportedLocale(),
      fc.uuid(),
    ])('when the invite is already complete', async (inviteId, [user, invite], locale, verifyToken) => {
      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
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
        .filter(([user, invite]) => !OrcidIdEquivalence(user.orcid, invite.orcid)),
      fc.supportedLocale(),
      fc.uuid(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], locale, verifyToken) => {
      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, locale, verifyToken, invite) => {
        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid(), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, user, locale, verifyToken, invite) => {
        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid()])(
      'when the invite is not found',
      async (inviteId, user, locale, verifyToken) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('not-found'))

        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
          getAuthorInvite,
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      },
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.uuid(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, locale, verifyToken, invite) => {
      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, locale, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInviteVerifyEmailAddressMatch.formatter, { id: inviteId, verify: verifyToken }),
      })
    },
  )
})
