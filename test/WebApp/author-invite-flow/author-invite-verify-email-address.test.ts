import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv } from '../../../src/author-invite.ts'
import { ContactEmailAddressIsNotFound, ContactEmailAddressIsUnavailable } from '../../../src/contact-email-address.ts'
import { ContactEmailAddresses } from '../../../src/ContactEmailAddresses/ContactEmailAddresses.ts'
import {
  ContactEmailAddressHasAlreadyBeenVerified,
  VerificationTokenInvalid,
} from '../../../src/ContactEmailAddresses/VerifyContactEmailAddress.ts'
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
          fc.uuid(),
        ],
        ([inviteId, [user, invite], locale, prereview, verifyToken]) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ContactEmailAddresses>()

            const actual = yield* Effect.promise(
              _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: () => TE.right(prereview),
                runtime,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'FlashMessageResponse',
              location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
              message: 'contact-email-verified',
            })
          }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, { verifyContactEmailAddress: () => Effect.void }))),
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
          fc.uuid(),
        ],
        ([inviteId, [user, invite], locale, prereview, verifyToken]) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ContactEmailAddresses>()

            const actual = yield* Effect.promise(
              _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: () => TE.right(prereview),
                runtime,
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
          }).pipe(
            Effect.provide(
              Layer.mock(ContactEmailAddresses, { verifyContactEmailAddress: () => new VerificationTokenInvalid() }),
            ),
          ),
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
          fc.uuid(),
        ],
        ([inviteId, [user, invite], locale, prereview, verifyToken]) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ContactEmailAddresses>()

            const actual = yield* Effect.promise(
              _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: () => TE.right(prereview),
                runtime,
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
          }).pipe(
            Effect.provide(
              Layer.mock(ContactEmailAddresses, {
                verifyContactEmailAddress: () => new ContactEmailAddressIsUnavailable({}),
              }),
            ),
          ),
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
      ],
      ([inviteId, [user, invite], locale, verifyToken, prereview]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: () => TE.right(prereview),
              runtime,
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
        }).pipe(
          Effect.provide(
            Layer.mock(ContactEmailAddresses, {
              verifyContactEmailAddress: () => new ContactEmailAddressHasAlreadyBeenVerified(),
            }),
          ),
        ),
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
          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: () => TE.right(prereview),
              runtime,
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
        }).pipe(
          Effect.provide(
            Layer.mock(ContactEmailAddresses, {
              verifyContactEmailAddress: () => new ContactEmailAddressIsNotFound(),
            }),
          ),
        ),
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

          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview,
              runtime,
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
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
    )

    it.effect.prop(
      'when the invite cannot be loaded',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid()],
      ([inviteId, user, locale, verifyToken]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('unavailable'))

          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite,
              getPrereview: shouldNotBeCalled,
              runtime,
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
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
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
          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
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
          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              runtime,
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
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
    )

    it.effect.prop(
      'when the invite is not assigned',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid(), fc.openAuthorInvite()],
      ([inviteId, user, locale, verifyToken, invite]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
    )

    it.effect.prop(
      'when the invite has been declined',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid(), fc.declinedAuthorInvite()],
      ([inviteId, user, locale, verifyToken, invite]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
    )

    it.effect.prop(
      'when the invite is not found',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.uuid()],
      ([inviteId, user, locale, verifyToken]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.left('not-found'))

          const runtime = yield* Effect.runtime<ContactEmailAddresses>()

          const actual = yield* Effect.promise(
            _.authorInviteVerifyEmailAddress({ id: inviteId, locale, user, verify: verifyToken })({
              getAuthorInvite,
              getPrereview: shouldNotBeCalled,
              runtime,
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
        }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.uuid(), fc.supportedLocale(), fc.uuid(), fc.authorInvite()],
    ([inviteId, locale, verifyToken, invite]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses>()

        const actual = yield* Effect.promise(
          _.authorInviteVerifyEmailAddress({ id: inviteId, locale, verify: verifyToken })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview: shouldNotBeCalled,
            runtime,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(authorInviteVerifyEmailAddressMatch.formatter, { id: inviteId, verify: verifyToken }),
        })
      }).pipe(Effect.provide(Layer.mock(ContactEmailAddresses, {}))),
  )
})
