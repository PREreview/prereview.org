import { Context, Effect, flow, Layer, Match, Scope } from 'effect'
import {
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
  type ContactEmailAddress,
} from '../contact-email-address.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import type { Email } from '../ExternalInteractions/index.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as StartVerificationOfContactEmailAddress from './StartVerificationOfContactEmailAddress.ts'
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
    startVerificationOfContactEmailAddress: (
      args: StartVerificationOfContactEmailAddress.Input,
    ) => Effect.Effect<void, StartVerificationOfContactEmailAddress.Error>
    resendVerificationEmail: (args: {
      orcidId: OrcidId
      resumeAt?: `/${string}`
    }) => Effect.Effect<
      void,
      | verifyContactEmailAddress.ContactEmailAddressHasAlreadyBeenVerified
      | ContactEmailAddressIsNotFound
      | ContactEmailAddressIsUnavailable
    >
  }
>() {}

export const layer = Layer.effect(
  ContactEmailAddresses,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<Email.Email>(), Context.omit(Scope.Scope))

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
      startVerificationOfContactEmailAddress: flow(
        StartVerificationOfContactEmailAddress.StartVerificationOfContactEmailAddress(contactEmailAddressStore),
        Effect.provide(context),
      ),
      resendVerificationEmail: () => new ContactEmailAddressIsUnavailable({ cause: 'not implemented' }),
    }
  }),
)
