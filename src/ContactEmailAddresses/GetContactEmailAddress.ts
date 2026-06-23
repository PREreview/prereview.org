import { Effect, flow, Match, type Either } from 'effect'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import * as Keyv from '../keyv.ts'
import * as Queries from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'

import type { OrcidId } from '../types/OrcidId.ts'
import { ContactEmailAddressIsNotFound, type ContactEmailAddress } from './ContactEmailAddress.ts'

export type Input = OrcidId

export type Result = Either.Either<ContactEmailAddress, Error>

export type Error = ContactEmailAddressIsNotFound | Queries.UnableToQuery

export const GetContactEmailAddress: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (
  input: Input,
) => Effect.Effect<Either.Either.Right<Result>, Either.Either.Left<Result>> = contactEmailAddressStore =>
  Effect.fn('ContactEmailAddresses.getContactEmailAddress')(
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
        Match.when('unavailable', () => new Queries.UnableToQuery({ cause: 'unknown' })),
        Match.exhaustive,
      ),
    ),
  )
