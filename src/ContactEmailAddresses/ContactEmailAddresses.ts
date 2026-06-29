import { Context, Effect, type Either, flow, Layer, Scope } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import type { EventStore } from '../EventStore.ts'
import type { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Keyv from '../keyv.ts'
import type { Uuid } from '../types/index.ts'
import * as GetContactEmailAddress from './GetContactEmailAddress.ts'
import * as ImportContactAddress from './ImportContactAddress.ts'
import * as ResendVerificationEmail from './ResendVerificationEmail.ts'
import * as StartVerificationOfContactEmailAddress from './StartVerificationOfContactEmailAddress.ts'
import * as UseAuthorInviteEmailAddress from './UseAuthorInviteEmailAddress.ts'
import * as verifyContactEmailAddress from './VerifyContactEmailAddress.ts'

export class ContactEmailAddresses extends Context.Tag('ContactEmailAddresses')<
  ContactEmailAddresses,
  {
    getContactEmailAddress: (
      args: GetContactEmailAddress.Input,
    ) => Effect.Effect<
      Either.Either.Right<GetContactEmailAddress.Result>,
      Either.Either.Left<GetContactEmailAddress.Result>
    >
    importContactAddress: Commands.FromCommand<typeof ImportContactAddress.ImportContactAddress>
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
      Effect.context<Email.Email | OrcidRecords.OrcidRecords | Uuid.GenerateUuid | EventStore>(),
      Context.omit(Scope.Scope),
    )

    const { authorInviteStore, contactEmailAddressStore } = yield* Keyv.KeyvStores

    return {
      getContactEmailAddress: GetContactEmailAddress.GetContactEmailAddress(contactEmailAddressStore),
      importContactAddress: yield* Commands.makeCommand(ImportContactAddress.ImportContactAddress),
      verifyContactEmailAddress: flow(
        verifyContactEmailAddress.VerifyContactEmailAddress(contactEmailAddressStore),
        Effect.provide(context),
      ),
      useAuthorInviteEmailAddress: flow(
        UseAuthorInviteEmailAddress.UseAuthorInviteEmailAddress(contactEmailAddressStore, authorInviteStore),
        Effect.provide(context),
      ),
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
