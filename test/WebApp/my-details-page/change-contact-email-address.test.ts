import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import { ContactEmailAddressHasAlreadyBeenVerified } from '../../../src/ContactEmailAddresses/VerifyContactEmailAddress.ts'
import {
  ContactEmailAddresses,
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
} from '../../../src/ContactEmailAddresses/index.ts'
import { Locale } from '../../../src/Context.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-contact-email-address.ts'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'

describe('changeContactEmailAddress', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(
        fc.constantFrom(new ContactEmailAddressIsNotFound(), new ContactEmailAddressIsUnavailable({})),
        fc.contactEmailAddress(),
      ),
    ],
    ([body, method, user, locale, emailAddress]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

        const actual = yield* Effect.promise(_.changeContactEmailAddress({ body, locale, method, user })({ runtime }))

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
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.mock(ContactEmailAddresses, { getContactEmailAddress: () => emailAddress }),
        ]),
      ),
  )

  describe('when the form has been submitted', () => {
    it.effect.prop(
      'when verification can be started',
      [fc.emailAddress(), fc.user(), fc.supportedLocale()],
      ([emailAddress, user, locale]) =>
        Effect.gen(function* () {
          const startVerificationOfContactEmailAddress = vi.fn<
            (typeof ContactEmailAddresses.Service)['startVerificationOfContactEmailAddress']
          >(_ => Effect.void)

          const runtime = yield* Effect.provide(
            Effect.runtime<ContactEmailAddresses | Locale>(),
            Layer.mock(ContactEmailAddresses, { startVerificationOfContactEmailAddress }),
          )

          const actual = yield* Effect.provide(
            Effect.promise(
              _.changeContactEmailAddress({ body: { emailAddress }, locale, method: 'POST', user })({ runtime }),
            ),
            Layer.mock(ContactEmailAddresses, {}),
          )

          expect(actual).toStrictEqual({
            _tag: 'FlashMessageResponse',
            location: format(myDetailsMatch.formatter, {}),
            message: 'verify-contact-email',
          })
          expect(startVerificationOfContactEmailAddress).toHaveBeenCalledWith({
            orcidId: user.orcid,
            emailAddress,
            resumeAt: format(myDetailsMatch.formatter, {}) as `/${string}`,
          })
        }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
    )

    it.effect.prop(
      'when it has already been verified',
      [fc.emailAddress(), fc.user(), fc.supportedLocale()],
      ([emailAddress, user, locale]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.changeContactEmailAddress({
              body: { emailAddress },
              locale,
              method: 'POST',
              user,
            })({ runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.mock(ContactEmailAddresses, {
              startVerificationOfContactEmailAddress: () => new ContactEmailAddressHasAlreadyBeenVerified(),
            }),
          ]),
        ),
    )

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
      ],
      ([body, user, locale]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.changeContactEmailAddress({ body, locale, method: 'POST', user })({ runtime }),
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
        }).pipe(Effect.provide([Layer.succeed(Locale, locale), Layer.mock(ContactEmailAddresses, {})])),
    )

    it.effect.prop(
      'verification cannot be started',
      [fc.record({ emailAddress: fc.emailAddress() }), fc.user(), fc.supportedLocale()],
      ([body, user, locale]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

          const actual = yield* Effect.promise(
            _.changeContactEmailAddress({ body, locale, method: 'POST', user })({ runtime }),
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
            Layer.succeed(Locale, locale),
            Layer.mock(ContactEmailAddresses, {
              startVerificationOfContactEmailAddress: () => new ContactEmailAddressIsUnavailable({}),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<ContactEmailAddresses | Locale>()

        const actual = yield* Effect.promise(
          _.changeContactEmailAddress({ body, locale, method, user: undefined })({ runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }).pipe(Effect.provide([Layer.succeed(Locale, locale), Layer.mock(ContactEmailAddresses, {})])),
  )
})
