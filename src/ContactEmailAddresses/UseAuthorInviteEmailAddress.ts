import { Data, Effect, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import type { EventStore } from '../EventStore.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import { Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'
import { UseAuthorInviteEmailAddressFromLegacyInvite } from './UseAuthorInviteEmailAddressFromLegacyInvite.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly inviteId: Uuid
}

export class AcceptedInvitationIsNotFound extends Data.TaggedError('AcceptedInvitationIsNotFound') {}

export type Error =
  ContactEmailAddressHasAlreadyBeenVerified | AcceptedInvitationIsNotFound | Commands.UnableToHandleCommand

export const UseAuthorInviteEmailAddress: (
  authorInviteStoreEnv: (typeof Keyv.KeyvStores.Service)['authorInviteStore'],
) => (input: Input) => Effect.Effect<void, Error, EventStore> = authorInviteStoreEnv =>
  Effect.fn('ContactEmailAddresses.useAuthorInviteEmailAddress')(
    function* (input) {
      const loggerEnv = yield* MakeDeprecatedLoggerEnv

      const invite = yield* pipe(
        FptsToEffect.readerTaskEither(Keyv.getAuthorInvite(input.inviteId), {
          authorInviteStore: authorInviteStoreEnv,
          ...loggerEnv,
        }),
        Effect.catchIf(
          error => error === 'not-found',
          () => new AcceptedInvitationIsNotFound(),
        ),
      )

      if (invite.status !== 'assigned' || invite.orcid !== input.orcidId) {
        return yield* new AcceptedInvitationIsNotFound()
      }

      const useLegacyCommand = yield* Commands.makeCommand(UseAuthorInviteEmailAddressFromLegacyInvite)

      yield* useLegacyCommand({
        orcidId: input.orcidId,
        inviteId: input.inviteId,
        emailAddress: invite.emailAddress,
        chosenAt: yield* Temporal.currentInstant,
      })
    },
    Effect.catchIf(
      error => error === 'unavailable',
      () => new Commands.UnableToHandleCommand({ cause: 'unknown' }),
    ),
  )
