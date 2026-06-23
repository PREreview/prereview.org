import { Effect, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { ContactEmailAddressIsNotFound } from './ContactEmailAddress.ts'
import { ContactEmailAddressHasAlreadyBeenVerified } from './VerifyContactEmailAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly resumeAt: `/${string}`
}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | ContactEmailAddressIsNotFound
  | Commands.UnableToHandleCommand

export const ResendVerificationEmail: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (
  input: Input,
) => Effect.Effect<void, Error, Email.Email | Locale | OrcidRecords.OrcidRecords> = contactEmailAddressStore =>
  Effect.fn(
    function* (input) {
      const email = yield* Email.Email
      const orcidRecords = yield* OrcidRecords.OrcidRecords
      const loggerEnv = yield* MakeDeprecatedLoggerEnv

      const contactAddress = yield* pipe(
        FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(input.orcidId), {
          contactEmailAddressStore,
          ...loggerEnv,
        }),
        Effect.filterOrElse(
          contactAddress => contactAddress._tag !== 'VerifiedContactEmailAddress',
          () => new ContactEmailAddressHasAlreadyBeenVerified(),
        ),
        Effect.catchIf(
          error => error === 'not-found',
          () => new ContactEmailAddressIsNotFound(),
        ),
        Effect.catchIf(
          error => error === 'unavailable',
          () => new Commands.UnableToHandleCommand({ cause: 'unknown' }),
        ),
      )

      const name = yield* orcidRecords.getName(input.orcidId)

      yield* email.verifyContactEmailAddress({
        name,
        emailAddress: contactAddress,
        redirectTo: input.resumeAt,
      })
    },
    Effect.catchTags({
      NameIsNotAvailable: error => new Commands.UnableToHandleCommand({ cause: error }),
      UnableToSendEmail: error => new Commands.UnableToHandleCommand({ cause: error }),
    }),
  )
