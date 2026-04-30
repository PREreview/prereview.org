import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import type { GetPrereviewEnv } from '../../../src/WebApp/author-invite-flow/check-page/index.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInvitePersona', () => {
  describe('when the user is logged in', () => {
    describe('when the form is submitted', () => {
      it.effect.prop(
        'when the persona is set',
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
          fc.constantFrom('public', 'pseudonym'),
        ],
        ([inviteId, [user, invite], locale, prereview, persona]) =>
          Effect.gen(function* () {
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
            const saveAuthorInvite = vi.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.authorInvitePersona({ body: { persona }, id: inviteId, locale, method: 'POST', user })({
                getAuthorInvite,
                getPrereview,
                saveAuthorInvite,
                getPublicPersona: shouldNotBeCalled,
                getPseudonymPersona: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
            })
            expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
            expect(getPrereview).toHaveBeenCalledWith(invite.review)
            expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { ...invite, persona })
          }),
      )

      it.effect.prop(
        "when the persona can't be set",
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
          fc.constantFrom('public', 'pseudonym'),
        ],
        ([inviteId, [user, invite], locale, prereview, persona]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.authorInvitePersona({ body: { persona }, id: inviteId, locale, method: 'POST', user })({
                getAuthorInvite: () => TE.right(invite),
                getPrereview: () => TE.right(prereview),
                saveAuthorInvite: () => TE.left('unavailable'),
                getPublicPersona: shouldNotBeCalled,
                getPseudonymPersona: shouldNotBeCalled,
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
    })

    it.effect.prop(
      'when the form is invalid',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.publicPersona(),
        fc.pseudonymPersona(),
        fc.supportedLocale(),
        fc.anything(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ],
      ([inviteId, [user, invite], publicPersona, pseudonymPersona, locale, body, prereview]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method: 'POST', user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: () => TE.right(prereview),
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
        }),
    )

    it.effect.prop(
      'when the form needs submitting',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.publicPersona(),
        fc.pseudonymPersona(),
        fc.supportedLocale(),
        fc.string().filter(method => method !== 'POST'),
        fc.anything(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
      ],
      ([inviteId, [user, invite], publicPersona, pseudonymPersona, locale, method, body, prereview]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite,
              getPrereview,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: [],
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
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
        fc.string(),
        fc.anything(),
      ],
      ([inviteId, [user, invite], locale, method, body]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: () => TE.left('unavailable'),
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything()],
      ([inviteId, user, locale, method, body]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.left('unavailable'),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
        fc.string(),
        fc.anything(),
      ],
      ([inviteId, [user, invite], locale, method, body]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
        fc.string(),
        fc.anything(),
      ],
      ([inviteId, [user, invite], locale, method, body]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything(), fc.openAuthorInvite()],
      ([inviteId, user, locale, method, body, invite]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything(), fc.declinedAuthorInvite()],
      ([inviteId, user, locale, method, body, invite]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything()],
      ([inviteId, user, locale, method, body]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInvitePersona({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.left('not-found'),
              getPrereview: shouldNotBeCalled,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
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
    [fc.uuid(), fc.supportedLocale(), fc.string(), fc.anything(), fc.authorInvite()],
    ([inviteId, locale, method, body, invite]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInvitePersona({ body, id: inviteId, locale, method })({
            getAuthorInvite: () => TE.right(invite),
            getPrereview: shouldNotBeCalled,
            saveAuthorInvite: shouldNotBeCalled,
            getPublicPersona: shouldNotBeCalled,
            getPseudonymPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      }),
  )
})
