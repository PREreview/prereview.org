import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetAuthorInviteEnv } from '../../../src/author-invite.ts'
import {
  ContactEmailAddressIsUnavailable,
  VerifiedContactEmailAddress,
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
} from '../../../src/contact-email-address.ts'
import { ContactEmailAddresses } from '../../../src/ContactEmailAddresses/index.ts'
import { Locale } from '../../../src/Context.ts'
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
import * as _ from '../../../src/WebApp/author-invite-flow/enter-email-address-page/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('authorInviteEnterEmailAddress', () => {
  describe('when the user is logged in', () => {
    describe('when the form is submitted', () => {
      it.effect.prop(
        'using the invite email address',
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
          fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
        ],
        ([inviteId, [user, invite], locale, prereview, contactEmailAddress]) =>
          Effect.gen(function* () {
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getContactEmailAddress = vi.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
              TE.fromEither(contactEmailAddress),
            )
            const getPrereview = vi.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
            const saveContactEmailAddress = vi.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
              TE.right(undefined),
            )

            const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

            const actual = yield* Effect.promise(
              _.authorInviteEnterEmailAddress({
                body: { useInvitedAddress: 'yes' },
                id: inviteId,
                locale,
                method: 'POST',
                user,
              })({
                getAuthorInvite,
                getContactEmailAddress,
                getPrereview,
                saveContactEmailAddress,
                runtime,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
            })
            expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
            expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
            expect(getPrereview).toHaveBeenCalledWith(invite.review)
            expect(saveContactEmailAddress).toHaveBeenCalledWith(
              user.orcid,
              new VerifiedContactEmailAddress({ value: invite.emailAddress }),
            )
          }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
      )

      it.effect.prop(
        'using a different email address',
        [
          fc.uuid(),
          fc
            .user()
            .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
          fc.supportedLocale(),
          fc.emailAddress(),
          fc.record({
            preprint: fc.record({
              language: fc.languageCode(),
              title: fc.html(),
            }),
          }),
          fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
        ],
        ([inviteId, [user, invite], locale, otherEmailAddress, prereview, contactEmailAddress]) =>
          Effect.gen(function* () {
            const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
            const getContactEmailAddress = vi.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
              TE.fromEither(contactEmailAddress),
            )
            const getPrereview = vi.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
            const startVerificationOfContactEmailAddress = vi.fn<
              (typeof ContactEmailAddresses.Service)['startVerificationOfContactEmailAddress']
            >(_ => Effect.void)

            const runtime = yield* Effect.provide(
              Effect.runtime<ContactEmailAddresses | Locale>(),
              Layer.mock(ContactEmailAddresses, { startVerificationOfContactEmailAddress }),
            )

            const actual = yield* Effect.promise(
              _.authorInviteEnterEmailAddress({
                body: { useInvitedAddress: 'no', otherEmailAddress },
                id: inviteId,
                locale,
                method: 'POST',
                user,
              })({
                getAuthorInvite,
                getContactEmailAddress,
                getPrereview,
                saveContactEmailAddress: shouldNotBeCalled,
                runtime,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
            })
            expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
            expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
            expect(getPrereview).toHaveBeenCalledWith(invite.review)
            expect(startVerificationOfContactEmailAddress).toHaveBeenCalledWith({
              orcidId: user.orcid,
              emailAddress: otherEmailAddress,
              resumeAt: format(authorInviteCheckMatch.formatter, { id: inviteId }) as `/${string}`,
            })
          }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
      )

      it.effect.prop(
        "ther verification email can't be sent",
        [
          fc.uuid(),
          fc
            .user()
            .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
          fc.supportedLocale(),
          fc.emailAddress(),
          fc.record({
            preprint: fc.record({
              language: fc.languageCode(),
              title: fc.html(),
            }),
          }),
          fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
        ],
        ([inviteId, [user, invite], locale, otherEmailAddress, prereview, contactEmailAddress]) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

            const actual = yield* Effect.promise(
              _.authorInviteEnterEmailAddress({
                body: { useInvitedAddress: 'no', otherEmailAddress },
                id: inviteId,
                locale,
                method: 'POST',
                user,
              })({
                getAuthorInvite: () => TE.right(invite),
                getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
                getPrereview: () => TE.right(prereview),
                saveContactEmailAddress: shouldNotBeCalled,
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
            Effect.provide([
              Layer.mock(ContactEmailAddresses, {
                startVerificationOfContactEmailAddress: () => new ContactEmailAddressIsUnavailable({}),
              }),
              Layer.succeed(Locale, locale),
            ]),
          ),
      )

      it.effect.prop(
        'when the form is invalid',
        [
          fc.uuid(),
          fc
            .user()
            .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
          fc.supportedLocale(),
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
          fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
        ],
        ([inviteId, [user, invite], locale, body, prereview, contactEmailAddress]) =>
          Effect.gen(function* () {
            const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

            const actual = yield* Effect.promise(
              _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method: 'POST', user })({
                getAuthorInvite: () => TE.right(invite),
                getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
                getPrereview: () => TE.right(prereview),
                saveContactEmailAddress: shouldNotBeCalled,
                runtime,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              canonical: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
              status: StatusCodes.BadRequest,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'form',
              js: ['conditional-inputs.js', 'error-summary.js'],
            })
          }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
      )
    })

    it.effect.prop(
      'when the form needs submitting',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.string().filter(method => method !== 'POST'),
        fc.anything(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
      ],
      ([inviteId, [user, invite], locale, method, body, prereview, contactEmailAddress]) =>
        Effect.gen(function* () {
          const getAuthorInvite = vi.fn<GetAuthorInviteEnv['getAuthorInvite']>(_ => TE.right(invite))
          const getPrereview = vi.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite,
              getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
              getPrereview,
              saveContactEmailAddress: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['conditional-inputs.js'],
          })
          expect(getAuthorInvite).toHaveBeenCalledWith(inviteId)
          expect(getPrereview).toHaveBeenCalledWith(invite.review)
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
    )

    it.effect.prop(
      'when the email address is already verified',
      [
        fc.uuid(),
        fc
          .user()
          .chain(user => fc.tuple(fc.constant(user), fc.assignedAuthorInvite({ orcid: fc.constant(user.orcid) }))),
        fc.supportedLocale(),
        fc.string(),
        fc.anything(),
        fc.record({
          preprint: fc.record({
            language: fc.languageCode(),
            title: fc.html(),
          }),
        }),
        fc.verifiedContactEmailAddress(),
      ],
      ([inviteId, [user, invite], locale, method, body, prereview, contactEmailAddress]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: () => TE.right(contactEmailAddress),
              getPrereview: () => TE.right(prereview),
              saveContactEmailAddress: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteCheckMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
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
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: () => TE.left('unavailable'),
              saveContactEmailAddress: shouldNotBeCalled,
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
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
    )

    it.effect.prop(
      'when the invite cannot be loaded',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything()],
      ([inviteId, user, locale, method, body]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.left('unavailable'),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
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
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
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
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
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
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
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
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
    )

    it.effect.prop(
      'when the invite is not assigned',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything(), fc.openAuthorInvite()],
      ([inviteId, user, locale, method, body, invite]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
    )

    it.effect.prop(
      'when the invite has been declined',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything(), fc.declinedAuthorInvite()],
      ([inviteId, user, locale, method, body, invite]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.right(invite),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
              runtime,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
          })
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
    )

    it.effect.prop(
      'when the invite is not found',
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.string(), fc.anything()],
      ([inviteId, user, locale, method, body]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method, user })({
              getAuthorInvite: () => TE.left('not-found'),
              getContactEmailAddress: shouldNotBeCalled,
              getPrereview: shouldNotBeCalled,
              saveContactEmailAddress: shouldNotBeCalled,
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
        }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.uuid(), fc.supportedLocale(), fc.string(), fc.anything(), fc.authorInvite()],
    ([inviteId, locale, method, body, invite]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

        const actual = yield* Effect.promise(
          _.authorInviteEnterEmailAddress({ body, id: inviteId, locale, method })({
            getAuthorInvite: () => TE.right(invite),
            getContactEmailAddress: shouldNotBeCalled,
            getPrereview: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            runtime,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(authorInviteMatch.formatter, { id: inviteId }),
        })
      }).pipe(Effect.provide([Layer.mock(ContactEmailAddresses, {}), Layer.succeed(Locale, locale)])),
  )
})
