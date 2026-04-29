import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-contact-email-address.ts'
import { UnverifiedContactEmailAddress } from '../../../src/contact-email-address.ts'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeContactEmailAddress', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.contactEmailAddress()),
    ],
    ([body, method, user, locale, emailAddress]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeContactEmailAddress({ body, locale, method, user })({
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.fromEither(emailAddress),
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
            getPublicPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeContactEmailAddressMatch.formatter, {}),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  describe('when the form has been submitted', () => {
    describe('when an email address is given', () => {
      it.effect.prop(
        'when it is different to the previous value',
        [
          fc.emailAddress(),
          fc.user(),
          fc.publicPersona(),
          fc.supportedLocale(),
          fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
          fc.uuid(),
        ],
        ([emailAddress, user, publicPersona, locale, existingEmailAddress, verificationToken]) =>
          Effect.gen(function* () {
            const saveContactEmailAddress = vi.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))
            const verifyContactEmailAddress = vi.fn<_.Env['verifyContactEmailAddress']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.changeContactEmailAddress({ body: { emailAddress }, locale, method: 'POST', user })({
                generateUuid: () => verificationToken,
                getContactEmailAddress: () => TE.fromEither(existingEmailAddress),
                saveContactEmailAddress,
                verifyContactEmailAddress,
                getPublicPersona: () => TE.right(publicPersona),
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'FlashMessageResponse',
              location: format(myDetailsMatch.formatter, {}),
              message: 'verify-contact-email',
            })
            expect(saveContactEmailAddress).toHaveBeenCalledWith(
              user.orcid,
              new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
            )
            expect(verifyContactEmailAddress).toHaveBeenCalledWith(
              publicPersona.name,
              new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
            )
          }),
      )

      it.effect.prop(
        'when it is the same as the previous value',
        [fc.contactEmailAddress(), fc.user(), fc.supportedLocale()],
        ([existingEmailAddress, user, locale]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.changeContactEmailAddress({
                body: { emailAddress: existingEmailAddress.value },
                locale,
                method: 'POST',
                user,
              })({
                generateUuid: shouldNotBeCalled,
                getContactEmailAddress: () => TE.right(existingEmailAddress),
                saveContactEmailAddress: shouldNotBeCalled,
                verifyContactEmailAddress: shouldNotBeCalled,
                getPublicPersona: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(myDetailsMatch.formatter, {}),
            })
          }),
      )
    })

    it.effect.prop(
      'it is not an email address',
      [
        fc.record({
          emailAddress: fc
            .nonEmptyString()
            .filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string)),
        }),
        fc.user(),
        fc.supportedLocale(),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      ],
      ([body, user, locale, emailAddress]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.changeContactEmailAddress({ body, locale, method: 'POST', user })({
              generateUuid: shouldNotBeCalled,
              getContactEmailAddress: () => TE.fromEither(emailAddress),
              saveContactEmailAddress: shouldNotBeCalled,
              verifyContactEmailAddress: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(changeContactEmailAddressMatch.formatter, {}),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
        }),
    )

    it.effect.prop(
      'the email address cannot be saved',
      [
        fc.record({ emailAddress: fc.emailAddress() }),
        fc.user(),
        fc.supportedLocale(),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
        fc.uuid(),
      ],
      ([body, user, locale, emailAddress, verificationToken]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.changeContactEmailAddress({ body, locale, method: 'POST', user })({
              generateUuid: () => verificationToken,
              getContactEmailAddress: () => TE.fromEither(emailAddress),
              saveContactEmailAddress: () => TE.left('unavailable'),
              verifyContactEmailAddress: shouldNotBeCalled,
              getPublicPersona: shouldNotBeCalled,
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
      'the verification email cannot be sent',
      [
        fc.record({ emailAddress: fc.emailAddress() }),
        fc.user(),
        fc.supportedLocale(),
        fc.publicPersona(),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
        fc.uuid(),
      ],
      ([body, user, locale, publicPersona, emailAddress, verificationToken]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.changeContactEmailAddress({ body, locale, method: 'POST', user })({
              generateUuid: () => verificationToken,
              getContactEmailAddress: () => TE.fromEither(emailAddress),
              saveContactEmailAddress: () => TE.right(undefined),
              verifyContactEmailAddress: () => TE.left('unavailable'),
              getPublicPersona: () => TE.right(publicPersona),
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

    describe('when no email address is set', () => {
      it.effect.prop(
        'when there was an email address before',
        [
          fc.record({ emailAddress: fc.constant('') }, { requiredKeys: [] }),
          fc.user(),
          fc.supportedLocale(),
          fc.contactEmailAddress(),
        ],
        ([body, user, locale, existingEmailAddress]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.changeContactEmailAddress({ body, locale, method: 'POST', user })({
                generateUuid: shouldNotBeCalled,
                getContactEmailAddress: () => TE.right(existingEmailAddress),
                saveContactEmailAddress: shouldNotBeCalled,
                verifyContactEmailAddress: shouldNotBeCalled,
                getPublicPersona: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              canonical: format(changeContactEmailAddressMatch.formatter, {}),
              status: StatusCodes.BadRequest,
              title: expect.anything(),
              nav: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'form',
              js: ['error-summary.js'],
            })
          }),
      )

      it.effect.prop(
        "when there wasn't an email address before",
        [fc.record({ emailAddress: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()],
        ([body, user, locale]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.changeContactEmailAddress({ body, locale, method: 'POST', user })({
                generateUuid: shouldNotBeCalled,
                getContactEmailAddress: () => TE.left('not-found'),
                saveContactEmailAddress: shouldNotBeCalled,
                verifyContactEmailAddress: shouldNotBeCalled,
                getPublicPersona: shouldNotBeCalled,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: format(myDetailsMatch.formatter, {}),
            })
          }),
      )
    })
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeContactEmailAddress({ body, locale, method, user: undefined })({
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
            getPublicPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
