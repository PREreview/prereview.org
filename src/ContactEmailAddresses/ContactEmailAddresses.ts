import { Context, Effect, flow, Layer, Match, Scope } from 'effect'
import {
  ContactEmailAddressIsNotFound,
  ContactEmailAddressIsUnavailable,
  type ContactEmailAddress,
} from '../contact-email-address.ts'
import type { Locale } from '../Context.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import type { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { Uuid } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as ResendVerificationEmail from './ResendVerificationEmail.ts'
import * as StartVerificationOfContactEmailAddress from './StartVerificationOfContactEmailAddress.ts'
import * as UseAuthorInviteEmailAddress from './UseAuthorInviteEmailAddress.ts'
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
    useAuthorInviteEmailAddress: (
      args: UseAuthorInviteEmailAddress.Input,
    ) => Effect.Effect<void, UseAuthorInviteEmailAddress.Error>
    startVerificationOfContactEmailAddress: (
      args: StartVerificationOfContactEmailAddress.Input,
    ) => Effect.Effect<void, StartVerificationOfContactEmailAddress.Error, Locale>
    resendVerificationEmail: (
      args: ResendVerificationEmail.Input,
    ) => Effect.Effect<void, ResendVerificationEmail.Error, Locale>
  }
>() {}

export const layer = Layer.effect(
  ContactEmailAddresses,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(
      Effect.context<Email.Email | OrcidRecords.OrcidRecords | Uuid.GenerateUuid>(),
      Context.omit(Scope.Scope),
    )

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
      useAuthorInviteEmailAddress: UseAuthorInviteEmailAddress.UseAuthorInviteEmailAddress(contactEmailAddressStore),
      startVerificationOfContactEmailAddress: flow(
        StartVerificationOfContactEmailAddress.StartVerificationOfContactEmailAddress(contactEmailAddressStore),
        Effect.provide(context),
      ),
      resendVerificationEmail: flow(
        ResendVerificationEmail.ResendVerificationEmail(contactEmailAddressStore),
        Effect.provide(context),
      ),
    }
  }),
)
