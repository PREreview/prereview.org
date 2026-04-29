import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import type { GetAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/author-invite.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInvite', () => {
  it.effect.prop(
    'when the user is not logged in',
    [
      fc.uuid(),
      fc.constant(undefined),
      fc.supportedLocale(),
      fc.authorInvite().filter(invite => invite.status !== 'declined'),
      fc.prereview(),
    ],
    ([inviteId, user, locale, invite, prereview]) =>
      Effect.gen(function* () {
        const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
        const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

        const actual = yield* Effect.promise(
          _.authorInvite({ id: inviteId, locale, user })({
            getAuthorInvite,
            getPrereview,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(authorInviteMatch.formatter, { id: inviteId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
          allowRobots: false,
        })
        expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      }),
  )

  describe('when the user is logged in', () => {
    it.effect.prop(
      'when the invite is open',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.openAuthorInvite(), fc.prereview()],
      ([inviteId, user, locale, invite, prereview]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

          const actual = yield* Effect.promise(
            _.authorInvite({ id: inviteId, locale, user })({
              getAuthorInvite,
              getPrereview,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(authorInviteMatch.formatter, { id: inviteId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
            allowRobots: false,
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
        }),
    )

    it.effect.prop(
      'when the invite is assigned',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.prereview(),
      ],
      ([inviteId, [user, invite], locale, prereview]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvite({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: () => TE.right(prereview),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteStartMatch.formatter, { id: inviteId }),
          })
        }),
    )

    it.effect.prop(
      'when the invite is completed',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.prereview(),
      ],
      ([inviteId, [user, invite], locale, prereview]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvite({ id: inviteId, locale, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: () => TE.right(prereview),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
          })
        }),
    )
  })

  it.effect.prop(
    'when the review cannot be loaded',
    [
      fc.uuid(),
      fc.oneof(
        fc.tuple(
          fc.constant(undefined),
          fc.authorInvite().filter(invite => invite.status !== 'declined'),
        ),
        fc
          .user()
          .chain(user =>
            fc.tuple(
              fc.constant(user),
              fc.oneof(
                fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }),
                fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }),
              ),
            ),
          ),
      ),
      fc.supportedLocale(),
    ],
    ([inviteId, [user, invite], locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInvite({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.right(invite),
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
    [fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([inviteId, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInvite({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.left('unavailable'),
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
    'when the invite is assigned to someone else',
    [
      fc.uuid(),
      fc
        .tuple(fc.user(), fc.oneof(fc.assignedAuthorInvite(), fc.completedAuthorInvite()))
        .filter(([user, invite]) => !OrcidIdEquivalence(user.orcid, invite.orcid)),
      fc.supportedLocale(),
    ],
    ([inviteId, [user, invite], locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInvite({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.right(invite),
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
    'when the invite has been declined',
    [fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale(), fc.declinedAuthorInvite()],
    ([inviteId, user, locale, invite]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInvite({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.right(invite),
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
    [fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([inviteId, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInvite({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.left('not-found'),
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
