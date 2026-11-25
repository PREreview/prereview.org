import { Temporal } from '@js-temporal/polyfill'
import * as _ from '../../../src/Domain/ContactEmailAddresses/RecordEmailSentToVerifyContactAddress.ts'
import * as Events from '../../../src/Domain/Events/Events.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../vitest.ts'

const input = {
  contactAddressId: Uuid('578467ae-11e2-4ce9-876f-5fa2714282a5'),
  sentAt: Temporal.Now.instant(),
} satisfies _.Input

test('RecordEmailSentToVerifyContactAddress', () => {
  const { decide } = _.RecordEmailSentToVerifyContactAddress

  const actual = decide(input)

  expect(actual).toStrictEqual(
    new Events.EmailToVerifyContactAddressSent({
      contactAddressId: input.contactAddressId,
      sentAt: input.sentAt,
    }),
  )
})
