import { Effect, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import type { EventStore } from '../EventStore.ts'
import { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Queries from '../Queries.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import { Temporal, Uuid } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'
import { GetContactEmailAddress } from './GetContactEmailAddress.ts'
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
      const getAddress = yield* Queries.makeOnDemandQuery(GetContactEmailAddress)

      yield* recordCommand({
        contactAddressId: yield* uuid.v4(),
        orcidId: input.orcidId,
        emailAddress: input.emailAddress,
      })

      const contactAddress = yield* pipe(
        getAddress(input.orcidId),
        Effect.filterOrElse(
          contactAddress => contactAddress._tag !== 'VerifiedContactEmailAddress',
          () => new Commands.UnableToHandleCommand({ cause: 'contact address expected to be unverified' }),
        ),
        Effect.catchTag(
          'ContactEmailAddressIsNotFound',
          'UnableToQuery',
          error => new Commands.UnableToHandleCommand({ cause: error }),
        ),
      )

      yield* email.verifyContactEmailAddress({
        name,
        emailAddress: contactAddress,
        redirectTo: input.resumeAt,
      })

      yield* recordEmailCommand({
        contactAddressId: contactAddress.verificationToken,
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
