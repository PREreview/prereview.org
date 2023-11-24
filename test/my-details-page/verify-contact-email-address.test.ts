import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/verify-contact-email-address'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('verifyContactEmailAddress', () => {
  test.prop([fc.user(), fc.unverifiedContactEmailAddress()])(
    'when the email address is unverified',
    async (user, contactEmailAddress) => {
      const getContactEmailAddress = jest.fn<_.Env['getContactEmailAddress']>(_ => TE.right(contactEmailAddress))
      const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))

      const actual = await _.verifyContactEmailAddress({ verify: contactEmailAddress.verificationToken, user })({
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress,
        saveContactEmailAddress,
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: format(myDetailsMatch.formatter, {}),
        message: 'contact-email-verified',
      })
      expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
        type: 'verified',
        value: contactEmailAddress.value,
      })
    },
  )

  test.prop([fc.user(), fc.uuid(), fc.verifiedContactEmailAddress()])(
    'when the email address is already verified',
    async (user, verify, contactEmailAddress) => {
      const actual = await _.verifyContactEmailAddress({ verify, user })({
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.user(), fc.uuid(), fc.unverifiedContactEmailAddress()])(
    "when the verification token doesn't match",
    async (user, verify, contactEmailAddress) => {
      const actual = await _.verifyContactEmailAddress({ verify, user })({
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        saveContactEmailAddress: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.user(), fc.uuid()])('when there is no email address', async (user, verify) => {
    const actual = await _.verifyContactEmailAddress({ verify, user })({
      deleteContactEmailAddress: shouldNotBeCalled,
      getContactEmailAddress: () => TE.left('not-found'),
      saveContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.user(), fc.uuid()])("when the email address can't be loaded", async (user, verify) => {
    const actual = await _.verifyContactEmailAddress({ verify, user })({
      deleteContactEmailAddress: shouldNotBeCalled,
      getContactEmailAddress: () => TE.left('unavailable'),
      saveContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.uuid()])('when the user is not logged in', async verify => {
    const actual = await _.verifyContactEmailAddress({ verify, user: undefined })({
      deleteContactEmailAddress: shouldNotBeCalled,
      getContactEmailAddress: shouldNotBeCalled,
      saveContactEmailAddress: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(verifyContactEmailAddressMatch.formatter, { verify }),
    })
  })
})
