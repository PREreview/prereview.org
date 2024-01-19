import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as _ from '../src/email'
import * as fc from './fc'

describe('sendContactEmailAddressVerificationEmail', () => {
  test.prop([fc.origin(), fc.user(), fc.unverifiedContactEmailAddress()])(
    'when the email can be sent',
    async (publicUrl, user, emailAddress) => {
      const sendEmail = jest.fn<_.SendEmailEnv['sendEmail']>(_ => TE.right(undefined))

      const actual = await _.sendContactEmailAddressVerificationEmail(
        user,
        emailAddress,
      )({
        sendEmail,
        publicUrl,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { address: 'help@prereview.org', name: 'PREreview' },
          to: { address: emailAddress.value, name: user.name },
          subject: 'Verify your email address on PREreview',
        }),
      )
    },
  )

  test.prop([fc.origin(), fc.user(), fc.unverifiedContactEmailAddress()])(
    "when the email can't be sent",
    async (publicUrl, user, emailAddress) => {
      const actual = await _.sendContactEmailAddressVerificationEmail(
        user,
        emailAddress,
      )({
        publicUrl,
        sendEmail: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('sendContactEmailAddressVerificationEmailForReview', () => {
  test.prop([fc.origin(), fc.user(), fc.unverifiedContactEmailAddress(), fc.indeterminatePreprintId()])(
    'when the email can be sent',
    async (publicUrl, user, emailAddress, preprint) => {
      const sendEmail = jest.fn<_.SendEmailEnv['sendEmail']>(_ => TE.right(undefined))

      const actual = await _.sendContactEmailAddressVerificationEmailForReview(
        user,
        emailAddress,
        preprint,
      )({
        sendEmail,
        publicUrl,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { address: 'help@prereview.org', name: 'PREreview' },
          to: { address: emailAddress.value, name: user.name },
          subject: 'Verify your email address on PREreview',
        }),
      )
    },
  )

  test.prop([fc.origin(), fc.user(), fc.unverifiedContactEmailAddress(), fc.indeterminatePreprintId()])(
    "when the email can't be sent",
    async (publicUrl, user, emailAddress, preprint) => {
      const actual = await _.sendContactEmailAddressVerificationEmailForReview(
        user,
        emailAddress,
        preprint,
      )({
        publicUrl,
        sendEmail: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('sendAuthorInviteEmail', () => {
  test.prop([fc.origin(), fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }), fc.uuid()])(
    'when the email can be sent',
    async (publicUrl, person, authorInviteId) => {
      const sendEmail = jest.fn<_.SendEmailEnv['sendEmail']>(_ => TE.right(undefined))

      const actual = await _.sendAuthorInviteEmail(
        person,
        authorInviteId,
      )({
        sendEmail,
        publicUrl,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { address: 'help@prereview.org', name: 'PREreview' },
          to: { address: person.emailAddress, name: person.name },
          subject: 'Be listed as a PREreview author',
        }),
      )
    },
  )

  test.prop([fc.origin(), fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }), fc.uuid()])(
    "when the email can't be sent",
    async (publicUrl, person, authorInviteId) => {
      const actual = await _.sendAuthorInviteEmail(
        person,
        authorInviteId,
      )({
        publicUrl,
        sendEmail: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})
