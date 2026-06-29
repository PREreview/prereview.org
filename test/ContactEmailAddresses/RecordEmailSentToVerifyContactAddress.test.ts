import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import * as _ from '../../src/ContactEmailAddresses/RecordEmailSentToVerifyContactAddress.ts'
import * as Events from '../../src/Events.ts'
import { Uuid } from '../../src/types/Uuid.ts'

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
