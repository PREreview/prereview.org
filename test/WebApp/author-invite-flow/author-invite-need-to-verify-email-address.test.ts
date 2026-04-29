import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePublishedMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/need-to-verify-email-address-page/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInviteNeedToVerifyEmailAddress', () => {
  describe('when the user is logged in', () => {
    it.effect.prop(
      'when the email address needs to be verified',
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
        fc.unverifiedContactEmailAddress(),
      ],
      ([inviteId, [user, invite], locale, prereview, contactEmailAddress]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getPrereview = vi.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite,
              getContactEmailAddress: () => TE.right(contactEmailAddress),
              getPrereview,
            }),
          )

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
        }),
    )

    it.effect.prop(
      'when the email address is already verified',
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
        fc.verifiedContactEmailAddress(),
      ],
      ([inviteId, [user, invite], locale, prereview, contactEmailAddress]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: () => TE.right(contactEmailAddress),
              getPrereview: () => TE.right(prereview),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
          })
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
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ],
      ([inviteId, [user, invite], locale, prereview]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: () => TE.left('not-found'),
              getPrereview: () => TE.right(prereview),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
          })
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
      ],
      ([inviteId, [user, invite], locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: () => TE.left('unavailable'),
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
        }),
    )

    it.effect.prop(
      'when the invite cannot be loaded',
      [fc.uuid(), fc.user(), fc.supportedLocale()],
      ([inviteId, user, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.left('unavailable'),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
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
      ],
      ([inviteId, [user, invite], locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
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
      ],
      ([inviteId, [user, invite], locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.openAuthorInvite()],
      ([inviteId, user, locale, invite]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.declinedAuthorInvite()],
      ([inviteId, user, locale, invite]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale()],
      ([inviteId, user, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.left('not-found'),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
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
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.uuid(), fc.supportedLocale(), fc.authorInvite()],
    ([inviteId, locale, invite]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteNeedToVerifyEmailAddress({ id: inviteId, locale })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: shouldNotBeCalled,
            getPrereview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      }),
  )
})
