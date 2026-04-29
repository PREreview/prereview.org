import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv, SaveAuthorInviteEnv } from '../../../src/author-invite.ts'
import type { GetContactEmailAddressEnv } from '../../../src/contact-email-address.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidIdEquivalence } from '../../../src/types/OrcidId.ts'
import type {
  AddAuthorToPrereviewEnv,
  GetPrereviewEnv,
} from '../../../src/WebApp/author-invite-flow/check-page/index.ts'
import * as _ from '../../../src/WebApp/author-invite-flow/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInvite', () => {
  describe('when the user is logged in', () => {
    describe('when the form is submitted', () => {
      it.effect.prop(
        'when the author can be added',
        [
          fc.uuid(),
          fc.user().chain(user =>
            fc.tuple(
              fc.constant(user),
              fc.assignedAuthorInvite({
                orcid: fc.constant(user.orcid),
                persona: fc.constantFrom('public', 'pseudonym'),
              }),
            ),
          ),
          fc.publicPersona(),
          fc.pseudonymPersona(),
          fc.record({
            preprint: fc.record({
              language: fc.languageCode(),
              title: fc.html(),
            }),
          }),
          fc.verifiedContactEmailAddress(),
          fc.supportedLocale(),
        ],
        ([inviteId, [user, invite], publicPersona, pseudonymPersona, prereview, contactEmailAddress, locale]) =>
          Effect.gen(function* () {
            const addAuthorToPrereview = vi.fn<AddAuthorToPrereviewEnv['addAuthorToPrereview']>(_ =>
              TE.right(undefined),
            )
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
            const saveAuthorInvite = vi.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.authorInviteCheck({ id: inviteId, method: 'POST', user, locale })({
                addAuthorToPrereview,
                getAuthorInvite,
                getContactEmailAddress: () => TE.right(contactEmailAddress),
                getPrereview,
                saveAuthorInvite,
                getPublicPersona: invite.persona === 'public' ? () => TE.right(publicPersona) : shouldNotBeCalled,
                getPseudonymPersona: () => TE.right(pseudonymPersona),
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
            })
            expect(addAuthorToPrereview).toHaveBeenCalledWith(
              invite.review,
              { orcidId: user.orcid, pseudonym: pseudonymPersona.pseudonym },
              invite.persona === 'public' ? publicPersona : pseudonymPersona,
            )
            expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
            expect(getPrereview).toHaveBeenCalledWith(invite.review)
            expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, {
              status: 'completed',
              orcid: invite.orcid,
              review: invite.review,
            })
          }),
      )

      it.effect.prop(
        "when the author can't be added",
        [
          fc.uuid(),
          fc.user().chain(user =>
            fc.tuple(
              fc.constant(user),
              fc.assignedAuthorInvite({
                orcid: fc.constant(user.orcid),
                persona: fc.constantFrom('public', 'pseudonym'),
              }),
            ),
          ),
          fc.publicPersona(),
          fc.pseudonymPersona(),
          fc.record({
            preprint: fc.record({
              language: fc.languageCode(),
              title: fc.html(),
            }),
          }),
          fc.verifiedContactEmailAddress(),
          fc.supportedLocale(),
        ],
        ([inviteId, [user, invite], publicPersona, pseudonymPersona, prereview, contactEmailAddress, locale]) =>
          Effect.gen(function* () {
            const saveAuthorInvite = vi.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.authorInviteCheck({ id: inviteId, method: 'POST', user, locale })({
                addAuthorToPrereview: () => TE.left('unavailable'),
                getAuthorInvite: () => TE.right(invite),
                getContactEmailAddress: () => TE.right(contactEmailAddress),
                getPrereview: () => TE.right(prereview),
                saveAuthorInvite,
                getPublicPersona: () => TE.right(publicPersona),
                getPseudonymPersona: () => TE.right(pseudonymPersona),
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(saveAuthorInvite).toHaveBeenLastCalledWith(inviteId, invite)
          }),
      )
    })

    it.effect.prop(
      'when the form needs checking',
      [
        fc.uuid(),
        fc.user().chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.assignedAuthorInvite({
              orcid: fc.constant(user.orcid),
              persona: fc.constantFrom('public', 'pseudonym'),
            }),
          ),
        ),
        fc.publicPersona(),
        fc.pseudonymPersona(),
        fc.string().filter(method => method !== 'POST'),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.verifiedContactEmailAddress(),
        fc.supportedLocale(),
      ],
      ([inviteId, [user, invite], publicPersona, pseudonymPersona, method, prereview, contactEmailAddress, locale]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getPrereview = vi.fn<GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite,
              getContactEmailAddress: () => TE.right(contactEmailAddress),
              getPrereview,
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(authorInviteCheckMatch.formatter, { id: inviteId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
        }),
    )

    it.effect.prop(
      "when there isn't a verified email address",
      [
        fc.uuid(),
        fc.user().chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.assignedAuthorInvite({
              orcid: fc.constant(user.orcid),
              persona: fc.constantFrom('public', 'pseudonym'),
            }),
          ),
        ),
        fc.string(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
        fc.supportedLocale(),
      ],
      ([inviteId, [user, invite], method, prereview, contactEmailAddress, locale]) =>
        Effect.gen(function* () {
          const getContactEmailAddress = vi.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
            TE.fromEither(contactEmailAddress),
          )

          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress,
              getPrereview: () => TE.right(prereview),
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
          })
          expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        }),
    )

    it.effect.prop(
      'when the invite is incomplete',
      [
        fc.uuid(),
        fc.user().chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.assignedAuthorInvite({
              orcid: fc.constant(user.orcid),
              persona: fc.constant(undefined),
            }),
          ),
        ),
        fc.string().filter(method => method !== 'POST'),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.supportedLocale(),
      ],
      ([inviteId, [user, invite], method, prereview, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: () => TE.right(prereview),
              saveAuthorInvite: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
              getPseudonymPersona: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
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
        fc.string(),
        fc.supportedLocale(),
      ],
      ([inviteId, [user, invite], method, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.string(), fc.supportedLocale()],
      ([inviteId, user, method, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.left('unavailable'),
              getContactEmailAddress: shouldNotBeCalled,
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
        fc.string(),
        fc.supportedLocale(),
      ],
      ([inviteId, [user, invite], method, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
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
        fc.string(),
        fc.supportedLocale(),
      ],
      ([inviteId, [user, invite], method, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.string(), fc.openAuthorInvite(), fc.supportedLocale()],
      ([inviteId, user, method, invite, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.string(), fc.declinedAuthorInvite(), fc.supportedLocale()],
      ([inviteId, user, method, invite, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
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
      [fc.uuid(), fc.user(), fc.string(), fc.supportedLocale()],
      ([inviteId, user, method, locale]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.authorInviteCheck({ id: inviteId, method, user, locale })({
              addAuthorToPrereview: shouldNotBeCalled,
              getAuthorInvite: () => TE.left('not-found'),
              getContactEmailAddress: shouldNotBeCalled,
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
    [fc.uuid(), fc.string(), fc.authorInvite(), fc.supportedLocale()],
    ([inviteId, method, invite, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.authorInviteCheck({ id: inviteId, method, locale })({
            addAuthorToPrereview: shouldNotBeCalled,
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: shouldNotBeCalled,
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
