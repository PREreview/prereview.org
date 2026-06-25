import { Effect, pipe } from 'effect'
import { v5 } from 'uuid'
import * as Commands from '../Commands.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import type { EventStore } from '../EventStore.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { Uuid } from '../types/Uuid.ts'
import { VerifiedContactEmailAddress } from './ContactEmailAddress.ts'
import {
  ContactEmailAddressHasAlreadyBeenVerified,
  ContactEmailAddressIsNotFound,
  VerificationTokenInvalid,
} from './Errors.ts'
import { ImportContactAddress } from './ImportContactAddress.ts'

export interface Input {
  orcid: OrcidId
  verificationToken: Uuid
}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | VerificationTokenInvalid
  | ContactEmailAddressIsNotFound
  | Commands.UnableToHandleCommand

export const VerifyContactEmailAddress: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (input: Input) => Effect.Effect<void, Error, EventStore> = contactEmailAddressStore =>
  Effect.fn('ContactEmailAddresses.verifyContactEmailAddress')(
    function* (input) {
      const loggerEnv = yield* MakeDeprecatedLoggerEnv

      const contactEmailAddress = yield* FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(input.orcid), {
        contactEmailAddressStore,
        ...loggerEnv,
      })

      if (contactEmailAddress._tag === 'VerifiedContactEmailAddress') {
        return yield* new ContactEmailAddressHasAlreadyBeenVerified()
      }

      if (contactEmailAddress.verificationToken !== input.verificationToken) {
        return yield* new VerificationTokenInvalid()
      }

      yield* FptsToEffect.readerTaskEither(
        Keyv.saveContactEmailAddress(
          input.orcid,
          new VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
        ),
        {
          contactEmailAddressStore,
          ...loggerEnv,
        },
      )

      const contactAddressId = Uuid(
        v5(`${input.orcid}-${contactEmailAddress.value}`, Uuid('2b74ca85-7549-4e7d-ba0a-21a3b385d801')),
      )

      const importCommand = yield* Commands.makeCommand(ImportContactAddress)
      yield* importCommand({
        contactAddressId,
        emailAddress: contactEmailAddress.value,
        orcidId: input.orcid,
        verificationStatus: { status: 'verified' as const },
      })
    },
    Effect.catchIf(
      error => error === 'not-found',
      () => new ContactEmailAddressIsNotFound(),
    ),
    Effect.catchIf(
      error => error === 'unavailable',
      () => new Commands.UnableToHandleCommand({ cause: 'unknown' }),
    ),
    Effect.catchTags({
      ContactAddressIdHasAlreadyBeenUsed: error =>
        pipe(Effect.logError('contact address import failed'), Effect.annotateLogs({ error })),
      DetailsDoNotMatchExistingImport: error =>
        pipe(Effect.logError('contact address import failed'), Effect.annotateLogs({ error })),
    }),
  )
