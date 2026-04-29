import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/verify-contact-email-address.ts'
import { VerifiedContactEmailAddress } from '../../../src/contact-email-address.ts'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('verifyContactEmailAddress', () => {
  it.effect.prop(
    'when the email address is unverified',
    [fc.user(), fc.supportedLocale(), fc.unverifiedContactEmailAddress()],
    ([user, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const getContactEmailAddress = vi.fn<_.Env['getContactEmailAddress']>(_ => TE.right(contactEmailAddress))
        const saveContactEmailAddress = vi.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.verifyContactEmailAddress({ verify: contactEmailAddress.verificationToken, locale, user })({
            getContactEmailAddress,
            saveContactEmailAddress,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(myDetailsMatch.formatter, {}),
          message: 'contact-email-verified',
        })
        expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        expect(saveContactEmailAddress).toHaveBeenCalledWith(
          user.orcid,
          new VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
        )
      }),
  )

  it.effect.prop(
    'when the email address is already verified',
    [fc.user(), fc.supportedLocale(), fc.uuid(), fc.verifiedContactEmailAddress()],
    ([user, locale, verify, contactEmailAddress]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.verifyContactEmailAddress({ verify, locale, user })({
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            saveContactEmailAddress: shouldNotBeCalled,
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
    "when the verification token doesn't match",
    [fc.user(), fc.supportedLocale(), fc.uuid(), fc.unverifiedContactEmailAddress()],
    ([user, locale, verify, contactEmailAddress]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.verifyContactEmailAddress({ verify, locale, user })({
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            saveContactEmailAddress: shouldNotBeCalled,
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
    'when there is no email address',
    [fc.user(), fc.supportedLocale(), fc.uuid()],
    ([user, locale, verify]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.verifyContactEmailAddress({ verify, locale, user })({
            getContactEmailAddress: () => TE.left('not-found'),
            saveContactEmailAddress: shouldNotBeCalled,
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
    "when the email address can't be loaded",
    [fc.user(), fc.supportedLocale(), fc.uuid()],
    ([user, locale, verify]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.verifyContactEmailAddress({ verify, locale, user })({
            getContactEmailAddress: () => TE.left('unavailable'),
            saveContactEmailAddress: shouldNotBeCalled,
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

  it.effect.prop('when the user is not logged in', [fc.uuid(), fc.supportedLocale()], ([verify, locale]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.verifyContactEmailAddress({ verify, locale, user: undefined })({
          getContactEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(verifyContactEmailAddressMatch.formatter, { verify }),
      })
    }),
  )
})
