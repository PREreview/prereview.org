import { Command } from '@effect/cli'
import { Array, Console, Data, Effect, Match, pipe, Stream, String } from 'effect'
import { v5 } from 'uuid'
import { ContactEmailAddresses } from '../ContactEmailAddresses/index.ts'
import { DataStoreRedis } from '../Redis.ts'
import { OrcidId } from '../types/OrcidId.ts'
import { Uuid } from '../types/Uuid.ts'

const program = Effect.gen(function* () {
  const redis = yield* DataStoreRedis
  const contactEmailAddresses = yield* ContactEmailAddresses

  yield* pipe(
    Stream.fromAsyncIterable<Array<string>, RedisError>(
      redis.scanStream({
        match: 'contact-email-address:*',
      }),
      error => new RedisError({ cause: error }),
    ),
    Stream.flattenIterables,
    Stream.map(String.split(':')),
    Stream.map(Array.lastNonEmpty),
    Stream.map(OrcidId),
    Stream.runForEach(
      Effect.fnUntraced(function* (orcidId) {
        yield* Console.log(orcidId)

        yield* Effect.andThen(
          contactEmailAddresses.getContactEmailAddress(orcidId),
          Match.valueTags({
            VerifiedContactEmailAddress: current =>
              contactEmailAddresses.importContactAddress({
                contactAddressId:
                  current.contactAddressId ??
                  Uuid(v5(`${orcidId}-${current.value}`, 'f1ce865d-1a3a-4a9f-b386-5aa64fc446e3')),
                emailAddress: current.value,
                orcidId,
                verificationStatus: 'verified',
              }),
            UnverifiedContactEmailAddress: current =>
              contactEmailAddresses.importContactAddress({
                contactAddressId: current.verificationToken,
                emailAddress: current.value,
                orcidId,
                verificationStatus: 'unverified',
              }),
          }),
        )
      }),
    ),
  )

  yield* Console.log('Done')
})

export const ImportContactAddresses = Command.make('import-contact-addresses', {}, () => program)

class RedisError extends Data.TaggedError('RedisError')<{ cause?: unknown }> {}
