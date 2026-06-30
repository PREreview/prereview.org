import { Context, Effect, flow, Layer, Scope } from 'effect'
import * as Commands from '../Commands.ts'
import type { Locale } from '../Context.ts'
import type { EventStore } from '../EventStore.ts'
import type { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Keyv from '../keyv.ts'
import * as Queries from '../Queries.ts'
import type { Uuid } from '../types/index.ts'
import { GetContactEmailAddressUsingEvents } from './GetContactEmailAddressUsingEvents.ts'
import * as ImportContactAddress from './ImportContactAddress.ts'
import * as ResendVerificationEmail from './ResendVerificationEmail.ts'
import * as StartVerificationOfContactEmailAddress from './StartVerificationOfContactEmailAddress.ts'
import * as UseAuthorInviteEmailAddress from './UseAuthorInviteEmailAddress.ts'
import { VerifyContactEmailAddressUsingEvents } from './VerifyContactEmailAddressUsingEvents.ts'

export class ContactEmailAddresses extends Context.Tag('ContactEmailAddresses')<
  ContactEmailAddresses,
  {
    getContactEmailAddress: Queries.FromOnDemandQuery<typeof GetContactEmailAddressUsingEvents>
    importContactAddress: Commands.FromCommand<typeof ImportContactAddress.ImportContactAddress>
    verifyContactEmailAddress: Commands.FromCommand<typeof VerifyContactEmailAddressUsingEvents>
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

    const { authorInviteStore } = yield* Keyv.KeyvStores

    return {
      getContactEmailAddress: yield* Queries.makeOnDemandQuery(GetContactEmailAddressUsingEvents),
      importContactAddress: yield* Commands.makeCommand(ImportContactAddress.ImportContactAddress),
      verifyContactEmailAddress: yield* Commands.makeCommand(VerifyContactEmailAddressUsingEvents),
      useAuthorInviteEmailAddress: flow(
        UseAuthorInviteEmailAddress.UseAuthorInviteEmailAddress(authorInviteStore),
        Effect.provide(context),
      ),
      startVerificationOfContactEmailAddress: flow(
        StartVerificationOfContactEmailAddress.StartVerificationOfContactEmailAddress,
        Effect.provide(context),
      ),
      resendVerificationEmail: flow(ResendVerificationEmail.ResendVerificationEmail, Effect.provide(context)),
    }
  }),
)
