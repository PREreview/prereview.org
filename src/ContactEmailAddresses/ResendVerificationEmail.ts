import { Effect, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import type { EventStore } from '../EventStore.ts'
import { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Queries from '../Queries.ts'
import { Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { ContactEmailAddressHasAlreadyBeenVerified, type ContactEmailAddressIsNotFound } from './Errors.ts'
import { GetContactEmailAddress } from './GetContactEmailAddress.ts'
import { RecordEmailSentToVerifyContactAddress } from './RecordEmailSentToVerifyContactAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly resumeAt: `/${string}`
}

export type Error =
  ContactEmailAddressHasAlreadyBeenVerified | ContactEmailAddressIsNotFound | Commands.UnableToHandleCommand

export const ResendVerificationEmail: (
  input: Input,
) => Effect.Effect<void, Error, Email.Email | EventStore | Locale | OrcidRecords.OrcidRecords> = Effect.fn(
  function* (input) {
    const email = yield* Email.Email
    const orcidRecords = yield* OrcidRecords.OrcidRecords

    const getAddress = yield* Queries.makeOnDemandQuery(GetContactEmailAddress)

    const contactAddress = yield* pipe(
      getAddress(input.orcidId),
      Effect.filterOrElse(
        contactAddress => contactAddress._tag !== 'VerifiedContactEmailAddress',
        () => new ContactEmailAddressHasAlreadyBeenVerified(),
      ),
      Effect.catchTag('UnableToQuery', error => new Commands.UnableToHandleCommand({ cause: error })),
    )

    const name = yield* orcidRecords.getName(input.orcidId)

    const recordEmailCommand = yield* Commands.makeStatelessCommand(RecordEmailSentToVerifyContactAddress)

    yield* email.verifyContactEmailAddress({
      name,
      emailAddress: contactAddress,
      redirectTo: input.resumeAt,
    })

    yield* recordEmailCommand({
      contactAddressId: contactAddress.contactAddressId,
      sentAt: yield* Temporal.currentInstant,
    })
  },
  Effect.uninterruptible,
  Effect.catchTags({
    NameIsNotAvailable: error => new Commands.UnableToHandleCommand({ cause: error }),
    UnableToSendEmail: error => new Commands.UnableToHandleCommand({ cause: error }),
  }),
)
