import { Context, Data, Effect, flow, Layer, Match } from 'effect'
import {
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
  type ContactEmailAddress,
} from '../contact-email-address.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export class ContactEmailAddressHasAlreadyBeenVerified extends Data.TaggedError(
  'ContactEmailAddressHasAlreadyBeenVerified',
) {}

export class VerificationTokenInvalid extends Data.TaggedError('VerificationTokenInvalid') {}

export class ContactEmailAddresses extends Context.Tag('ContactEmailAddresses')<
  ContactEmailAddresses,
  {
    getContactEmailAddress: (
      orcid: OrcidId,
    ) => Effect.Effect<ContactEmailAddress, ContactEmailAddressIsNotFound | ContactEmailAddressIsUnavailable>
    verifyContactEmailAddress: (args: {
      orcid: OrcidId
      verificationToken: Uuid
    }) => Effect.Effect<
      void,
      | ContactEmailAddressHasAlreadyBeenVerified
      | VerificationTokenInvalid
      | ContactEmailAddressIsNotFound
      | ContactEmailAddressIsUnavailable
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
      verifyContactEmailAddress: () => new ContactEmailAddressIsUnavailable({}),
    }
  }),
)
