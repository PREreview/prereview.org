import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow/verify-email-address'
import type { GetContactEmailAddressEnv, SaveContactEmailAddressEnv } from '../../src/contact-email-address'
import {
  authorInviteCheckMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteVerifyEmailAddressMatch,
} from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInviteVerifyEmailAddress', () => {
  describe('when the user is logged in', () => {
    describe('when the email address needs to be verified', () => {
      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
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
        async (inviteId, [user, invite], prereview, [contactEmailAddress, verifyToken]) => {
          const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
            TE.right(undefined),
          )

          const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
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
          expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
            type: 'verified',
            value: contactEmailAddress.value,
          })
        },
      )

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
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
        async (inviteId, [user, invite], prereview, [contactEmailAddress, verifyToken]) => {
          const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress: shouldNotBeCalled,
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

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
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
        async (inviteId, [user, invite], prereview, [contactEmailAddress, verifyToken]) => {
          const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
            TE.left('unavailable'),
          )

          const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: Status.ServiceUnavailable,
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('problems'),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
            type: 'verified',
            value: contactEmailAddress.value,
          })
        },
      )
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
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
      async (inviteId, [user, invite], verifyToken, prereview, contactEmailAddress) => {
        const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.right(contactEmailAddress),
        )

        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress,
          getPrereview: () => TE.right(prereview),
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.uuid(),
      fc.record({
        preprint: fc.record({
          language: fc.languageCode(),
          title: fc.html(),
        }),
      }),
    ])('when there is no email address', async (inviteId, [user, invite], verifyToken, prereview) => {
      const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
        TE.left('not-found'),
      )

      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress,
        getPrereview: () => TE.right(prereview),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
      expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([
      fc.uuid(),
      fc.user().chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.uuid(),
    ])('when the review cannot be loaded', async (inviteId, [user, invite], verifyToken) => {
      const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.left('unavailable'))

      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview,
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPrereview).toHaveBeenCalledWith(invite.review)
    })

    test.prop([fc.uuid(), fc.user(), fc.uuid()])(
      'when the invite cannot be loaded',
      async (inviteId, user, verifyToken) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('unavailable'))

        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
          getAuthorInvite,
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
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
      },
    )

    test.prop([
      fc.uuid(),
      fc
        .user()
        .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
      fc.uuid(),
    ])('when the invite is already complete', async (inviteId, [user, invite], verifyToken) => {
      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
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
      fc.uuid(),
    ])('when the invite is assigned to someone else', async (inviteId, [user, invite], verifyToken) => {
      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.uuid(), fc.openAuthorInvite()])(
      'when the invite is not assigned',
      async (inviteId, user, verifyToken, invite) => {
        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.uuid(), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, user, verifyToken, invite) => {
        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
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

    test.prop([fc.uuid(), fc.user(), fc.uuid()])(
      'when the invite is not found',
      async (inviteId, user, verifyToken) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('not-found'))

        const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, user, verify: verifyToken })({
          getAuthorInvite,
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
      },
    )
  })

  test.prop([fc.uuid(), fc.uuid(), fc.authorInvite()])(
    'when the user is not logged in',
    async (inviteId, verifyToken, invite) => {
      const actual = await _.authorInviteVerifyEmailAddress({ id: inviteId, verify: verifyToken })({
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
