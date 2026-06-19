import { Data, Effect } from 'effect'
import {
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
  VerifiedContactEmailAddress,
} from '../contact-email-address.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  orcid: OrcidId
  verificationToken: Uuid
}

export class ContactEmailAddressHasAlreadyBeenVerified extends Data.TaggedError(
  'ContactEmailAddressHasAlreadyBeenVerified',
) {}

export class VerificationTokenInvalid extends Data.TaggedError('VerificationTokenInvalid') {}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | VerificationTokenInvalid
  | ContactEmailAddressIsNotFound
  | ContactEmailAddressIsUnavailable

export const VerifyContactEmailAddress: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (input: Input) => Effect.Effect<void, Error> = contactEmailAddressStore =>
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
    },
    Effect.catchIf(
      error => error === 'not-found',
      () => new ContactEmailAddressIsNotFound(),
    ),
    Effect.catchIf(
      error => error === 'unavailable',
      () => new ContactEmailAddressIsUnavailable({ cause: 'unknown' }),
    ),
  )
