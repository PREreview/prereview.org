import { Effect } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import type { EventStore } from '../EventStore.ts'
import { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import { Temporal, Uuid } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { UnverifiedContactEmailAddress } from './ContactEmailAddress.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'
import { RecordContactAddress } from './RecordContactAddress.ts'
import { RecordEmailSentToVerifyContactAddress } from './RecordEmailSentToVerifyContactAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly emailAddress: EmailAddress
  readonly resumeAt: `/${string}`
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | Commands.UnableToHandleCommand

export const StartVerificationOfContactEmailAddress: (
  input: Input,
) => Effect.Effect<void, Error, Email.Email | EventStore | Locale | OrcidRecords.OrcidRecords | Uuid.GenerateUuid> =
  Effect.fn(
    function* (input) {
      const email = yield* Email.Email
      const orcidRecords = yield* OrcidRecords.OrcidRecords
      const uuid = yield* Uuid.GenerateUuid

      const name = yield* orcidRecords.getName(input.orcidId)

      const recordEmailCommand = yield* Commands.makeStatelessCommand(RecordEmailSentToVerifyContactAddress)
      const recordCommand = yield* Commands.makeCommand(RecordContactAddress)

      const contactAddressId = yield* uuid.v4()

      yield* recordCommand({
        contactAddressId,
        orcidId: input.orcidId,
        emailAddress: input.emailAddress,
      })

      yield* email.verifyContactEmailAddress({
        name,
        emailAddress: new UnverifiedContactEmailAddress({
          value: input.emailAddress,
          verificationToken: contactAddressId,
        }),
        redirectTo: input.resumeAt,
      })

      yield* recordEmailCommand({
        contactAddressId,
        sentAt: yield* Temporal.currentInstant,
      })
    },
    Effect.uninterruptible,
    Effect.catchTags({
      ContactAddressIdHasAlreadyBeenUsed: error => new Commands.UnableToHandleCommand({ cause: error }),
      NameIsNotAvailable: error => new Commands.UnableToHandleCommand({ cause: error }),
      UnableToSendEmail: error => new Commands.UnableToHandleCommand({ cause: error }),
    }),
  )
