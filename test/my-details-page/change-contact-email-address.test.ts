import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { RequiresVerifiedEmailAddressEnv } from '../../src/feature-flags'
import * as _ from '../../src/my-details-page/change-contact-email-address'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeContactEmailAddress', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.contactEmailAddress()),
  ])('when there is a logged in user', async (body, method, user, emailAddress) => {
    const actual = await _.changeContactEmailAddress({ body, method, user })({
      generateUuid: shouldNotBeCalled,
      deleteContactEmailAddress: shouldNotBeCalled,
      getContactEmailAddress: () => TE.fromEither(emailAddress),
      requiresVerifiedEmailAddress: shouldNotBeCalled,
      saveContactEmailAddress: shouldNotBeCalled,
      verifyContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeContactEmailAddressMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('email address'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('email address'),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    describe('when an email address is given', () => {
      test.prop([
        fc.emailAddress(),
        fc.user(),
        fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
        fc.uuid(),
        fc.boolean(),
      ])(
        'when it is different to the previous value',
        async (emailAddress, user, existingEmailAddress, verificationToken, requiresVerifiedEmailAddress) => {
          const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))
          const verifyContactEmailAddress = jest.fn<_.Env['verifyContactEmailAddress']>(_ => TE.right(undefined))

          const actual = await _.changeContactEmailAddress({ body: { emailAddress }, method: 'POST', user })({
            generateUuid: () => verificationToken,
            deleteContactEmailAddress: shouldNotBeCalled,
            getContactEmailAddress: () => TE.fromEither(existingEmailAddress),
            requiresVerifiedEmailAddress: () => requiresVerifiedEmailAddress,
            saveContactEmailAddress,
            verifyContactEmailAddress,
          })()

          expect(actual).toStrictEqual({
            _tag: 'FlashMessageResponse',
            location: format(myDetailsMatch.formatter, {}),
            message: 'verify-contact-email',
          })
          expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
            type: 'unverified',
            value: emailAddress,
            verificationToken,
          })
          expect(verifyContactEmailAddress).toHaveBeenCalledWith(user, {
            type: 'unverified',
            value: emailAddress,
            verificationToken,
          })
        },
      )

      test.prop([fc.contactEmailAddress(), fc.user(), fc.boolean()])(
        'when it is the same as the previous value',
        async (existingEmailAddress, user, requiresVerifiedEmailAddress) => {
          const actual = await _.changeContactEmailAddress({
            body: { emailAddress: existingEmailAddress.value },
            method: 'POST',
            user,
          })({
            generateUuid: shouldNotBeCalled,
            deleteContactEmailAddress: shouldNotBeCalled,
            getContactEmailAddress: () => TE.right(existingEmailAddress),
            requiresVerifiedEmailAddress: () => requiresVerifiedEmailAddress,
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
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.boolean(),
    ])('it is not an email address', async (body, user, emailAddress, requiresVerifiedEmailAddress) => {
      const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
        generateUuid: shouldNotBeCalled,
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress: () => TE.fromEither(emailAddress),
        requiresVerifiedEmailAddress: () => requiresVerifiedEmailAddress,
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeContactEmailAddressMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('email address'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('email address'),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    })

    test.prop([
      fc.record({ emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.uuid(),
      fc.boolean(),
    ])(
      'the email address cannot be saved',
      async (body, user, emailAddress, verificationToken, requiresVerifiedEmailAddress) => {
        const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
          generateUuid: () => verificationToken,
          deleteContactEmailAddress: () => TE.left('unavailable'),
          getContactEmailAddress: () => TE.fromEither(emailAddress),
          requiresVerifiedEmailAddress: () => requiresVerifiedEmailAddress,
          saveContactEmailAddress: () => TE.left('unavailable'),
          verifyContactEmailAddress: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.record({ emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.uuid(),
      fc.boolean(),
    ])(
      'the verification email cannot be sent',
      async (body, user, emailAddress, verificationToken, requiresVerifiedEmailAddress) => {
        const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
          generateUuid: () => verificationToken,
          deleteContactEmailAddress: () => shouldNotBeCalled,
          getContactEmailAddress: () => TE.fromEither(emailAddress),
          requiresVerifiedEmailAddress: () => requiresVerifiedEmailAddress,
          saveContactEmailAddress: () => TE.right(undefined),
          verifyContactEmailAddress: () => TE.left('unavailable'),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    describe('when no email address is set', () => {
      describe('when there was an email address before', () => {
        test.prop([
          fc.record({ emailAddress: fc.constant('') }, { withDeletedKeys: true }),
          fc.user(),
          fc.contactEmailAddress(),
        ])('when a verified email address is required', async (body, user, existingEmailAddress) => {
          const requiresVerifiedEmailAddress = jest.fn<RequiresVerifiedEmailAddressEnv['requiresVerifiedEmailAddress']>(
            _ => true,
          )

          const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
            generateUuid: shouldNotBeCalled,
            deleteContactEmailAddress: shouldNotBeCalled,
            getContactEmailAddress: () => TE.right(existingEmailAddress),
            requiresVerifiedEmailAddress,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(changeContactEmailAddressMatch.formatter, {}),
            status: Status.BadRequest,
            title: expect.stringContaining('email address'),
            nav: expect.stringContaining('Back'),
            main: expect.stringContaining('email address'),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
          expect(requiresVerifiedEmailAddress).toHaveBeenCalledWith(user)
        })

        test.prop([
          fc.record({ emailAddress: fc.constant('') }, { withDeletedKeys: true }),
          fc.user(),
          fc.contactEmailAddress(),
        ])("when a verified email address isn't required", async (body, user, existingEmailAddress) => {
          const deleteContactEmailAddress = jest.fn<_.Env['deleteContactEmailAddress']>(_ => TE.right(undefined))

          const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
            generateUuid: shouldNotBeCalled,
            deleteContactEmailAddress,
            getContactEmailAddress: () => TE.right(existingEmailAddress),
            requiresVerifiedEmailAddress: () => false,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(deleteContactEmailAddress).toHaveBeenCalledWith(user.orcid)
        })
      })

      test.prop([fc.record({ emailAddress: fc.constant('') }, { withDeletedKeys: true }), fc.user(), fc.boolean()])(
        "when there wasn't an email address before",
        async (body, user, requiresVerifiedEmailAddress) => {
          const actual = await _.changeContactEmailAddress({ body, method: 'POST', user })({
            generateUuid: shouldNotBeCalled,
            deleteContactEmailAddress: shouldNotBeCalled,
            getContactEmailAddress: () => TE.left('not-found'),
            requiresVerifiedEmailAddress: () => requiresVerifiedEmailAddress,
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
      deleteContactEmailAddress: shouldNotBeCalled,
      getContactEmailAddress: shouldNotBeCalled,
      requiresVerifiedEmailAddress: shouldNotBeCalled,
      saveContactEmailAddress: shouldNotBeCalled,
      verifyContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
