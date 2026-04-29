import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import type { GetAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  VerifiedContactEmailAddress,
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
} from '../../../src/contact-email-address.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteVerifyEmailAddressMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/verify-email-address.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInviteVerifyEmailAddress', () => {
  describe('when the user is logged in', () => {
    describe('when the email address needs to be verified', () => {
      it.effect.prop(
        'when the email address can be verified',
        [
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
        ],
        ([inviteId, [user, invite], locale, prereview, [contactEmailAddress, verifyToken]]) =>
          Effect.gen(function* () {
            const saveContactEmailAddress = vi.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
              TE.right(undefined),
            )

            const actual = yield* Effect.promise(
              _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
                getAuthorInvite: () => TE.right(invite),
                getContactEmailAddress: () => TE.right(contactEmailAddress),
                getPrereview: () => TE.right(prereview),
                saveContactEmailAddress,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'FlashMessageResponse',
              location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
              message: 'contact-email-verified',
            })
            expect(saveContactEmailAddress).toHaveBeenCalledWith(
              user.orcid,
              new VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
            )
          }),
      )

      it.effect.prop(
        "when the token doesn't match",
        [
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
        ],
        ([inviteId, [user, invite], locale, prereview, [contactEmailAddress, verifyToken]]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
                getAuthorInvite: () => TE.right(invite),
                getContactEmailAddress: () => TE.right(contactEmailAddress),
                getPrereview: () => TE.right(prereview),
                saveContactEmailAddress: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.NotFound,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }),
      )

      it.effect.prop(
        "when the email address can't be verified",
        [
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
        ],
        ([inviteId, [user, invite], locale, prereview, [contactEmailAddress, verifyToken]]) =>
          Effect.gen(function* () {
            const saveContactEmailAddress = vi.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
              TE.left('unavailable'),
            )

            const actual = yield* Effect.promise(
              _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
                getAuthorInvite: () => TE.right(invite),
                getContactEmailAddress: () => TE.right(contactEmailAddress),
                getPrereview: () => TE.right(prereview),
                saveContactEmailAddress,
              }),
            )

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
          }),
      )
    })

    it.effect.prop(
      'when the email address is already verified',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.uuid(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.verifiedContactEmailAddress(),
      ],
      ([inviteId, [user, invite], locale, verifyToken, prereview, contactEmailAddress]) =>
        Effect.gen(function* () {
          const getContactEmailAddress = vi.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
            TE.right(contactEmailAddress),
          )

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress,
              getPrereview: () => TE.right(prereview),
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        }),
    )

    it.effect.prop(
      'when there is no email address',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.uuid(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ],
      ([inviteId, [user, invite], locale, verifyToken, prereview]) =>
        Effect.gen(function* () {
          const getContactEmailAddress = vi.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
            TE.left('not-found'),
          )

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress,
              getPrereview: () => TE.right(prereview),
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        }),
    )

    it.effect.prop(
      'when the review cannot be loaded',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.uuid(),
      ],
      ([inviteId, [user, invite], locale, verifyToken]) =>
        Effect.gen(function* () {
          const getPrereview = vi.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.left('unavailable'))

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
        }),
    )

    it.effect.prop(
      'when the invite cannot be loaded',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid()],
      ([inviteId, user, locale, verifyToken]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('unavailable'))

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite,
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        }),
    )

    it.effect.prop(
      'when the invite is already complete',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.uuid(),
      ],
      ([inviteId, [user, invite], locale, verifyToken]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
          })
        }),
    )

    it.effect.prop(
      'when the invite is assigned to someone else',
      [
        fc.uuid(),
        fc
          .tuple(fc.user(), fc.assignedAuthorInvite())
          .filter(([user, invite]) => !OrcidIdEquivalence(user.orcid, invite.orcid)),
        fc.supportedLocale(),
        fc.uuid(),
      ],
      ([inviteId, [user, invite], locale, verifyToken]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.Forbidden,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the invite is not assigned',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid(), fc.openAuthorInvite()],
      ([inviteId, user, locale, verifyToken, invite]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteMatch.formatter, { id: inviteId }),
          })
        }),
    )

    it.effect.prop(
      'when the invite has been declined',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid(), fc.declinedAuthorInvite()],
      ([inviteId, user, locale, verifyToken, invite]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
          })
        }),
    )

    it.effect.prop(
      'when the invite is not found',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid()],
      ([inviteId, user, locale, verifyToken]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('not-found'))

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite,
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        }),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.uuid(), fc.supportedLocale(), fc.uuid(), fc.authorInvite()],
    ([inviteId, locale, verifyToken, invite]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteVerifyEmailAddress({ id: inviteId, locale, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: shouldNotBeCalled,
            getPrereview: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(authorInviteVerifyEmailAddressMatch.formatter, { id: inviteId, verify: verifyToken }),
        })
      }),
  )
})
