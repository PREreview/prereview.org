import { Data, Effect, Option, pipe } from 'effect'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import * as Keyv from '../keyv.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import { ContactEmailAddressIsUnavailable, VerifiedContactEmailAddress } from './ContactEmailAddress.ts'
import { ContactEmailAddressHasAlreadyBeenVerified } from './VerifyContactEmailAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly inviteId: Uuid
}

export class AcceptedInvitationIsNotFound extends Data.TaggedError('AcceptedInvitationIsNotFound') {}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | AcceptedInvitationIsNotFound
  | ContactEmailAddressIsUnavailable

export const UseAuthorInviteEmailAddress: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
  authorInviteStoreEnv: (typeof Keyv.KeyvStores.Service)['authorInviteStore'],
) => (input: Input) => Effect.Effect<void, Error> = (contactEmailAddressStore, authorInviteStoreEnv) =>
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

      const contactEmailAddress = yield* pipe(
        FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(input.orcidId), {
          contactEmailAddressStore,
          ...loggerEnv,
        }),
        Effect.map(Option.some),
        Effect.catchIf(
          error => error === 'not-found',
          () => Effect.succeedNone,
        ),
      )

      if (Option.isSome(contactEmailAddress) && contactEmailAddress.value._tag === 'VerifiedContactEmailAddress') {
        return yield* new ContactEmailAddressHasAlreadyBeenVerified()
      }

      yield* FptsToEffect.readerTaskEither(
        Keyv.saveContactEmailAddress(input.orcidId, new VerifiedContactEmailAddress({ value: invite.emailAddress })),
        {
          contactEmailAddressStore,
          ...loggerEnv,
        },
      )
    },
    Effect.catchIf(
      error => error === 'unavailable',
      () => new ContactEmailAddressIsUnavailable({ cause: 'unknown' }),
    ),
  )
