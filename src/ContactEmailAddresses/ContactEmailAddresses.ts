import { Context, Effect, flow, Layer, Match } from 'effect'
import {
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
  type ContactEmailAddress,
} from '../contact-email-address.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as verifyContactEmailAddress from './VerifyContactEmailAddress.ts'

export class ContactEmailAddresses extends Context.Tag('ContactEmailAddresses')<
  ContactEmailAddresses,
  {
    getContactEmailAddress: (
      orcid: OrcidId,
    ) => Effect.Effect<ContactEmailAddress, ContactEmailAddressIsNotFound | ContactEmailAddressIsUnavailable>
    verifyContactEmailAddress: (
      args: verifyContactEmailAddress.Input,
    ) => Effect.Effect<void, verifyContactEmailAddress.Error>
    startVerificationOfContactEmailAddress: (args: {
      orcidId: OrcidId
      emailAddress: EmailAddress
      resumeAt?: `/${string}`
    }) => Effect.Effect<
      void,
      verifyContactEmailAddress.ContactEmailAddressHasAlreadyBeenVerified | ContactEmailAddressIsUnavailable
    >
  }
>() {}

export const layer = Layer.effect(
  ContactEmailAddresses,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* Keyv.KeyvStores

    return {
      getContactEmailAddress: Effect.fn('ContactEmailAddresses.getContactEmailAddress')(
        function* (orcid) {
          const loggerEnv = yield* MakeDeprecatedLoggerEnv

          return yield* FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
            contactEmailAddressStore,
            ...loggerEnv,
          })
        },
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new ContactEmailAddressIsNotFound()),
            Match.when('unavailable', () => new ContactEmailAddressIsUnavailable({})),
            Match.exhaustive,
          ),
        ),
      ),
      verifyContactEmailAddress: verifyContactEmailAddress.VerifyContactEmailAddress(contactEmailAddressStore),
      startVerificationOfContactEmailAddress: () => new ContactEmailAddressIsUnavailable({ cause: 'not implemented' }),
    }
  }),
)
