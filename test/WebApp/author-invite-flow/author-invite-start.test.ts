import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  authorInviteDeclineMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/author-invite-start.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInviteStart', () => {
  describe('when the review can be loaded', () => {
    describe('the user is logged in', () => {
      it.effect.prop(
        'the invite is open',
        [
          fc.uuid(),
          fc.user(),
          fc.supportedLocale(),
          fc.openAuthorInvite(),
          fc.record({
            preprint: fc.record({
              language: fc.languageCode(),
              title: fc.html(),
            }),
          }),
        ],
        ([inviteId, user, locale, invite, prereview]) =>
          Effect.gen(function* () {
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
            const saveAuthorInvite = vi.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.authorInviteStart({ id: inviteId, locale, user })({
                getAuthorInvite,
                getPrereview,
                saveAuthorInvite,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
            })
            expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
            expect(getPrereview).toHaveBeenCalledWith(invite.review)
            expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, {
              status: 'assigned',
              emailAddress: invite.emailAddress,
              orcid: user.orcid,
              review: invite.review,
            })
          }),
      )

      it.effect.prop(
        'the invite is already assigned to the user',
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
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

            const actual = yield* Effect.promise(
              _.authorInviteStart({ id: inviteId, locale, user })({
                getAuthorInvite,
                getPrereview,
                saveAuthorInvite: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              canonical: format(authorInviteStartMatch.formatter, { id: inviteId }),
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
        'the invite is already assigned to someone else',
        [
          fc.uuid(),
          fc
            .tuple(fc.user(), fc.oneof(fc.assignedAuthorInvite(), fc.completedAuthorInvite()))
            .filter(([user, invite]) => !OrcidIdEquivalence(user.orcid, invite.orcid)),
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
              _.authorInviteStart({ id: inviteId, locale, user })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: () => TE.right(prereview),
                saveAuthorInvite: shouldNotBeCalled,
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
        'the invite is already completed',
        [
          fc.uuid(),
          fc
            .user()
            .chain(user => fc.tuple(fc.constant(user), fc.completedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
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
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

            const actual = yield* Effect.promise(
              _.authorInviteStart({ id: inviteId, locale, user })({
                getAuthorInvite,
                getPrereview,
                saveAuthorInvite: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
            })
            expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
            expect(getPrereview).toHaveBeenCalledWith(invite.review)
          }),
      )
    })

    it.effect.prop(
      'the user is logged not in',
      [
        fc.uuid(),
        fc.authorInvite().filter(invite => invite.status !== 'declined'),
        fc.supportedLocale(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ],
      ([inviteId, invite, locale, prereview]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

          const actual = yield* Effect.promise(
            _.authorInviteStart({ id: inviteId, locale })({
              getAuthorInvite,
              getPrereview,
              saveAuthorInvite: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'LogInResponse',
            location: format(authorInviteStartMatch.formatter, { id: inviteId }),
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
        }),
    )
  })

  it.effect.prop(
    'when the review cannot be loaded',
    [
      fc.uuid(),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.authorInvite().filter(invite => invite.status !== 'declined'),
    ],
    ([inviteId, user, locale, invite]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteStart({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview: () => TE.left('unavailable'),
            saveAuthorInvite: shouldNotBeCalled,
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
    'when the invite has been declined',
    [fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale(), fc.declinedAuthorInvite()],
    ([inviteId, user, locale, invite]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteStart({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview: shouldNotBeCalled,
            saveAuthorInvite: shouldNotBeCalled,
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
    'when the invite cannot be loaded',
    [fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([inviteId, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteStart({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.left('unavailable'),
            getPrereview: shouldNotBeCalled,
            saveAuthorInvite: shouldNotBeCalled,
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
    'when the invite is not found',
    [fc.uuid(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([inviteId, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteStart({ id: inviteId, locale, user })({
            getAuthorInvite: () => TE.left('not-found'),
            getPrereview: shouldNotBeCalled,
            saveAuthorInvite: shouldNotBeCalled,
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
