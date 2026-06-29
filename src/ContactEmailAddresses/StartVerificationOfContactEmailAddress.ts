import { Effect, Equal, Option, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import type { EventStore } from '../EventStore.ts'
import { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import { Uuid } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { UnverifiedContactEmailAddress } from './ContactEmailAddress.ts'
import { ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'
import { RecordContactAddress } from './RecordContactAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly emailAddress: EmailAddress
  readonly resumeAt: `/${string}`
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | Commands.UnableToHandleCommand

export const StartVerificationOfContactEmailAddress: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (
  input: Input,
) => Effect.Effect<
  void,
  Error,
  Email.Email | EventStore | Locale | OrcidRecords.OrcidRecords | Uuid.GenerateUuid
> = contactEmailAddressStore =>
  Effect.fn(
    function* (input) {
      const email = yield* Email.Email
      const orcidRecords = yield* OrcidRecords.OrcidRecords
      const uuid = yield* Uuid.GenerateUuid
      const loggerEnv = yield* MakeDeprecatedLoggerEnv

      const currentContact = yield* pipe(
        FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(input.orcidId), {
          contactEmailAddressStore,
          ...loggerEnv,
        }),
        Effect.map(Option.some),
        Effect.catchIf(
          error => error === 'not-found',
          () => Effect.succeedNone,
        ),
      )

      if (
        Option.isSome(currentContact) &&
        currentContact.value._tag === 'VerifiedContactEmailAddress' &&
        Equal.equals(currentContact.value.value, input.emailAddress)
      ) {
        return yield* new ContactEmailAddressHasAlreadyBeenVerified()
      }

      const name = yield* orcidRecords.getName(input.orcidId)

      if (
        Option.isSome(currentContact) &&
        currentContact.value._tag === 'UnverifiedContactEmailAddress' &&
        Equal.equals(currentContact.value.value, input.emailAddress)
      ) {
        return yield* email.verifyContactEmailAddress({
          name,
          emailAddress: currentContact.value,
          redirectTo: input.resumeAt,
        })
      }

      const newContact = new UnverifiedContactEmailAddress({
        value: input.emailAddress,
        verificationToken: yield* uuid.v4(),
      })

      yield* FptsToEffect.readerTaskEither(Keyv.saveContactEmailAddress(input.orcidId, newContact), {
        contactEmailAddressStore,
        ...loggerEnv,
      })

      const recordCommand = yield* Commands.makeCommand(RecordContactAddress)

      yield* recordCommand({
        contactAddressId: newContact.verificationToken,
        orcidId: input.orcidId,
        emailAddress: newContact.value,
      }).pipe(
        Effect.catchTags({
          ContactAddressIdHasAlreadyBeenUsed: error =>
            pipe(Effect.logError('recording contact address failed'), Effect.annotateLogs({ error })),
        }),
      )

      yield* email.verifyContactEmailAddress({
        name,
        emailAddress: newContact,
        redirectTo: input.resumeAt,
      })
    },
    Effect.uninterruptible,
    Effect.catchIf(
      error => error === 'unavailable',
      () => new Commands.UnableToHandleCommand({ cause: 'unknown' }),
    ),
    Effect.catchTags({
      NameIsNotAvailable: error => new Commands.UnableToHandleCommand({ cause: error }),
      UnableToSendEmail: error => new Commands.UnableToHandleCommand({ cause: error }),
    }),
  )
