import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as _ from '../src/email.js'
import * as fc from './fc.js'

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

test.prop([
  fc.origin(),
  fc.record({
    name: fc.nonEmptyString(),
    emailAddress: fc.emailAddress(),
  }),
  fc.uuid(),
  fc.record({
    author: fc.string(),
    preprint: fc.preprintTitle(),
  }),
])('createAuthorInviteEmail', (publicUrl, person, authorInviteId, newPrereview) => {
  const actual = _.createAuthorInviteEmail(person, authorInviteId, newPrereview)({ publicUrl })

  expect(actual).toStrictEqual(
    expect.objectContaining({
      from: { address: 'help@prereview.org', name: 'PREreview' },
      to: { address: person.emailAddress, name: person.name },
      subject: 'Be listed as a PREreview author',
    }),
  )
})
