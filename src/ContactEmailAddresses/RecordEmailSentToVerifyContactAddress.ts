import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { Temporal } from '../types/index.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly contactAddressId: Uuid
  readonly sentAt: Temporal.Instant
}

const decide = (input: Input): Events.Event => new Events.EmailToVerifyContactAddressSent(input)

export const RecordEmailSentToVerifyContactAddress = Commands.StatelessCommand({
  name: 'ContactEmailAddresses.recordEmailSentToVerifyContactAddress',
  decide,
})
