import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { Eq as eqOrcid } from 'orcid-id-ts'
import type { GetAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow/enter-email-address-page'
import type {
  GetContactEmailAddressEnv,
  SaveContactEmailAddressEnv,
  VerifyContactEmailAddressForInvitedAuthorEnv,
} from '../../src/contact-email-address'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
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
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
      ])('using the invite email address', async (inviteId, [user, invite], prereview, contactEmailAddress) => {
        const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.fromEither(contactEmailAddress),
        )
        const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
        const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
          TE.right(undefined),
        )

        const actual = await _.authorInviteEnterEmailAddress({
          body: { useInvitedAddress: 'yes' },
          id: inviteId,
          method: 'POST',
          user,
        })({
          generateUuid: shouldNotBeCalled,
          getAuthorInvite,
          getContactEmailAddress,
          getPrereview,
          saveContactEmailAddress,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
        expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
          type: 'verified',
          value: invite.emailAddress,
        })
      })

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.emailAddress(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
        fc.uuid(),
      ])(
        'using a different email address',
        async (inviteId, [user, invite], otherEmailAddress, prereview, contactEmailAddress, uuid) => {
          const getAuthorInvite = jest.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
            TE.fromEither(contactEmailAddress),
          )
          const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
          const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
            TE.right(undefined),
          )
          const verifyContactEmailAddressForInvitedAuthor = jest.fn<
            VerifyContactEmailAddressForInvitedAuthorEnv['verifyContactEmailAddressForInvitedAuthor']
          >(_ => TE.right(undefined))

          const actual = await _.authorInviteEnterEmailAddress({
            body: { useInvitedAddress: 'no', otherEmailAddress },
            id: inviteId,
            method: 'POST',
            user,
          })({
            generateUuid: () => uuid,
            getAuthorInvite,
            getContactEmailAddress,
            getPrereview,
            saveContactEmailAddress,
            verifyContactEmailAddressForInvitedAuthor,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
          expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
          expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
            type: 'unverified',
            value: otherEmailAddress,
            verificationToken: uuid,
          })
          expect(verifyContactEmailAddressForInvitedAuthor).toHaveBeenCalledWith({
            user,
            emailAddress: { type: 'unverified', value: otherEmailAddress, verificationToken: uuid },
            authorInvite: inviteId,
          })
        },
      )

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.emailAddress(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
        fc.uuid(),
      ])(
        "ther verification email can't be sent",
        async (inviteId, [user, invite], otherEmailAddress, prereview, contactEmailAddress, uuid) => {
          const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
            TE.right(undefined),
          )
          const verifyContactEmailAddressForInvitedAuthor = jest.fn<
            VerifyContactEmailAddressForInvitedAuthorEnv['verifyContactEmailAddressForInvitedAuthor']
          >(_ => TE.left('unavailable'))

          const actual = await _.authorInviteEnterEmailAddress({
            body: { useInvitedAddress: 'no', otherEmailAddress },
            id: inviteId,
            method: 'POST',
            user,
          })({
            generateUuid: () => uuid,
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress,
            verifyContactEmailAddressForInvitedAuthor,
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
            type: 'unverified',
            value: otherEmailAddress,
            verificationToken: uuid,
          })
          expect(verifyContactEmailAddressForInvitedAuthor).toHaveBeenCalledWith({
            user,
            emailAddress: { type: 'unverified', value: otherEmailAddress, verificationToken: uuid },
            authorInvite: inviteId,
          })
        },
      )

      test.prop([
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.oneof(
          fc.record({ useInvitedAddress: fc.constant('yes') }),
          fc.record({ useInvitedAddress: fc.constant('no'), otherEmailAddress: fc.emailAddress() }),
        ),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
        fc.uuid(),
      ])(
        "when the contact email address can't be saved",
        async (inviteId, [user, invite], body, prereview, contactEmailAddress, uuid) => {
          const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method: 'POST', user })({
            generateUuid: () => uuid,
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getPrereview: () => TE.right(prereview),
            saveContactEmailAddress: () => TE.left('unavailable'),
            verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
          generateUuid: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPrereview: () => TE.right(prereview),
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
          generateUuid: shouldNotBeCalled,
          getAuthorInvite,
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPrereview,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
          generateUuid: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPrereview: () => TE.right(prereview),
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
        generateUuid: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: () => TE.left('unavailable'),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
          generateUuid: shouldNotBeCalled,
          getAuthorInvite: () => TE.left('unavailable'),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
        generateUuid: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
        generateUuid: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
          generateUuid: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.anything(), fc.declinedAuthorInvite()])(
      'when the invite has been declined',
      async (inviteId, user, method, body, invite) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          generateUuid: shouldNotBeCalled,
          getAuthorInvite: () => TE.right(invite),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        })
      },
    )

    test.prop([fc.uuid(), fc.user(), fc.string(), fc.anything()])(
      'when the invite is not found',
      async (inviteId, user, method, body) => {
        const actual = await _.authorInviteEnterEmailAddress({ body, id: inviteId, method, user })({
          generateUuid: shouldNotBeCalled,
          getAuthorInvite: () => TE.left('not-found'),
          getContactEmailAddress: shouldNotBeCalled,
          getPrereview: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
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
        generateUuid: shouldNotBeCalled,
        getAuthorInvite: () => TE.right(invite),
        getContactEmailAddress: shouldNotBeCalled,
        getPrereview: shouldNotBeCalled,
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddressForInvitedAuthor: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(authorInviteMatch.formatter, { id: inviteId }),
      })
    },
  )
})
