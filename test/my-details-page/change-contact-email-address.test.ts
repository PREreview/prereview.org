import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { UnverifiedContactEmailAddress } from '../../src/contact-email-address.js'
import * as _ from '../../src/my-details-page/change-contact-email-address.js'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('changeContactEmailAddress', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.contactEmailAddress()),
  ])('when there is a logged in user', async (body, method, user, emailAddress) => {
    const actual = await _.changeContactEmailAddress({ body, method, user })({
      generateUuid: shouldNotBeCalled,
      getContactEmailAddress: () => TE.fromEither(emailAddress),
      saveContactEmailAddress: shouldNotBeCalled,
      verifyContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeContactEmailAddressMatch.formatter, {}),
      status: Status.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    describe('when an email address is given', () => {
      test.prop([
        fc.emailAddress(),
        fc.user(),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
        fc.uuid(),
      ])(
        'when it is different to the previous value',
        async (emailAddress, user, existingEmailAddress, verificationToken) => {
          const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))
          const verifyContactEmailAddress = jest.fn<_.Env['verifyContactEmailAddress']>(_ => TE.right(undefined))

          const actual = await _.changeContactEmailAddress({ body: { emailAddress }, method: 'POST', user })({
            generateUuid: () => verificationToken,
            getContactEmailAddress: () => TE.fromEither(existingEmailAddress),
            saveContactEmailAddress,
            verifyContactEmailAddress,
          })()

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
            user,
            new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
          )
        },
      )

      test.prop([fc.contactEmailAddress(), fc.user()])(
        'when it is the same as the previous value',
        async (existingEmailAddress, user) => {
          const actual = await _.changeContactEmailAddress({
            body: { emailAddress: existingEmailAddress.value },
            method: 'POST',
            user,
          })({
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.right(existingEmailAddress),
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
        },
      )
    })

    test.prop([
      fc.record({
        emailAddress: fc
          .nonEmptyString()
          .filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string)),
      }),
      fc.user(),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
    ])('it is not an email address', async (body, user, emailAddress) => {
      const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
        generateUuid: shouldNotBeCalled,
        getContactEmailAddress: () => TE.fromEither(emailAddress),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeContactEmailAddressMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    })

    test.prop([
      fc.record({ emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.uuid(),
    ])('the email address cannot be saved', async (body, user, emailAddress, verificationToken) => {
      const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
        generateUuid: () => verificationToken,
        getContactEmailAddress: () => TE.fromEither(emailAddress),
        saveContactEmailAddress: () => TE.left('unavailable'),
        verifyContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([
      fc.record({ emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.uuid(),
    ])('the verification email cannot be sent', async (body, user, emailAddress, verificationToken) => {
      const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
        generateUuid: () => verificationToken,
        getContactEmailAddress: () => TE.fromEither(emailAddress),
        saveContactEmailAddress: () => TE.right(undefined),
        verifyContactEmailAddress: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    describe('when no email address is set', () => {
      test.prop([
        fc.record({ emailAddress: fc.constant('') }, { requiredKeys: [] }),
        fc.user(),
        fc.contactEmailAddress(),
      ])('when there was an email address before', async (body, user, existingEmailAddress) => {
        const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
          generateUuid: shouldNotBeCalled,
          getContactEmailAddress: () => TE.right(existingEmailAddress),
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeContactEmailAddressMatch.formatter, {}),
          status: Status.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      })

      test.prop([fc.record({ emailAddress: fc.constant('') }, { requiredKeys: [] }), fc.user()])(
        "when there wasn't an email address before",
        async (body, user) => {
          const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.left('not-found'),
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
        },
      )
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeContactEmailAddress({ body, method, user: undefined })({
      generateUuid: shouldNotBeCalled,
      getContactEmailAddress: shouldNotBeCalled,
      saveContactEmailAddress: shouldNotBeCalled,
      verifyContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
