import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { SaveAuthorInviteEnv } from '../../../src/author-invite.ts'
import { authorInviteDeclineMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/decline-page/index.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInviteDecline', () => {
  describe('when the form has been submitted', () => {
    it.effect.prop(
      'when the invite has already been declined',
      [fc.uuid(), fc.declinedAuthorInvite(), fc.supportedLocale()],
      ([inviteId, invite, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteDecline({ id: inviteId, locale, method: 'POST' })({
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

    describe('when the invite is open', () => {
      it.effect.prop(
        'when the invite can be saved',
        [fc.uuid(), fc.openAuthorInvite(), fc.supportedLocale()],
        ([inviteId, invite, locale]) =>
          Effect.gen(function* () {
            const saveAuthorInvite = vi.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.authorInviteDecline({ id: inviteId, locale, method: 'POST' })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: shouldNotBeCalled,
                saveAuthorInvite,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
            })
            expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
          }),
      )

      it.effect.prop(
        "when the invite can't be saved",
        [fc.uuid(), fc.openAuthorInvite(), fc.supportedLocale()],
        ([inviteId, invite, locale]) =>
          Effect.gen(function* () {
            const saveAuthorInvite = vi.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.left('unavailable'))

            const actual = yield* Effect.promise(
              _.authorInviteDecline({ id: inviteId, locale, method: 'POST' })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: shouldNotBeCalled,
                saveAuthorInvite,
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
            expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
          }),
      )
    })

    it.effect.prop(
      'when the invite has been declined',
      [fc.uuid(), fc.string().filter(method => method !== 'POST'), fc.declinedAuthorInvite(), fc.supportedLocale()],
      ([inviteId, method, invite, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteDecline({ id: inviteId, locale, method })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
            allowRobots: false,
          })
        }),
    )
  })

  it.effect.prop(
    'when the invite is open',
    [
      fc.uuid(),
      fc.string().filter(method => method !== 'POST'),
      fc.openAuthorInvite(),
      fc.prereview(),
      fc.supportedLocale(),
    ],
    ([inviteId, method, invite, review, locale]) =>
      Effect.gen(function* () {
        const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(() => TE.right(review))

        const actual = yield* Effect.promise(
          _.authorInviteDecline({ id: inviteId, locale, method })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview,
            saveAuthorInvite: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
          allowRobots: false,
        })
        expect(getPrereview).toHaveBeenCalledWith(invite.review)
      }),
  )

  it.effect.prop(
    "when the review can't be loaded",
    [fc.uuid(), fc.string().filter(method => method !== 'POST'), fc.openAuthorInvite(), fc.supportedLocale()],
    ([inviteId, method, invite, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteDecline({ id: inviteId, locale, method })({
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
    'when the invite is not open or declined',
    [
      fc.uuid(),
      fc.string(),
      fc.authorInvite().filter(invite => invite.status !== 'open' && invite.status !== 'declined'),
      fc.supportedLocale(),
    ],
    ([inviteId, method, invite, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteDecline({ id: inviteId, locale, method })({
            getAuthorInvite: () => TE.right(invite),
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

  it.effect.prop(
    'when the invite is not found',
    [fc.uuid(), fc.string(), fc.supportedLocale()],
    ([inviteId, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteDecline({ id: inviteId, locale, method })({
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
