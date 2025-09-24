import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { VerifiedContactEmailAddress } from '../../src/contact-email-address.ts'
import * as _ from '../../src/my-details-page/verify-contact-email-address.ts'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('verifyContactEmailAddress', () => {
  test.prop([fc.user(), fc.supportedLocale(), fc.unverifiedContactEmailAddress()])(
    'when the email address is unverified',
    async (user, locale, contactEmailAddress) => {
      const getContactEmailAddress = jest.fn<_.Env['getContactEmailAddress']>(_ => TE.right(contactEmailAddress))
      const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))

      const actual = await _.verifyContactEmailAddress({ verify: contactEmailAddress.verificationToken, locale, user })(
        {
          getContactEmailAddress,
          saveContactEmailAddress,
        },
      )()

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
    },
  )

  test.prop([fc.user(), fc.supportedLocale(), fc.uuid(), fc.verifiedContactEmailAddress()])(
    'when the email address is already verified',
    async (user, locale, verify, contactEmailAddress) => {
      const actual = await _.verifyContactEmailAddress({ verify, locale, user })({
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.user(), fc.supportedLocale(), fc.uuid(), fc.unverifiedContactEmailAddress()])(
    "when the verification token doesn't match",
    async (user, locale, verify, contactEmailAddress) => {
      const actual = await _.verifyContactEmailAddress({ verify, locale, user })({
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.user(), fc.supportedLocale(), fc.uuid()])(
    'when there is no email address',
    async (user, locale, verify) => {
      const actual = await _.verifyContactEmailAddress({ verify, locale, user })({
        getContactEmailAddress: () => TE.left('not-found'),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.user(), fc.supportedLocale(), fc.uuid()])(
    "when the email address can't be loaded",
    async (user, locale, verify) => {
      const actual = await _.verifyContactEmailAddress({ verify, locale, user })({
        getContactEmailAddress: () => TE.left('unavailable'),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.uuid(), fc.supportedLocale()])('when the user is not logged in', async (verify, locale) => {
    const actual = await _.verifyContactEmailAddress({ verify, locale, user: undefined })({
      getContactEmailAddress: shouldNotBeCalled,
      saveContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(verifyContactEmailAddressMatch.formatter, { verify }),
    })
  })
})
