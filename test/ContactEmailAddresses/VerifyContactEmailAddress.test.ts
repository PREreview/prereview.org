import { LibsqlClient } from '@effect/sql-libsql'
import { expect, it } from '@effect/vitest'
import { Array, Effect, Either, Layer, Option, pipe, Struct } from 'effect'
import {
  ContactEmailAddressHasAlreadyBeenVerified,
  ContactEmailAddressIsNotFound,
  VerificationTokenInvalid,
} from '../../src/ContactEmailAddresses/Errors.ts'
import * as _ from '../../src/ContactEmailAddresses/VerifyContactEmailAddress.ts'
import { type Event, Events } from '../../src/Events.ts'
import { EventStore } from '../../src/EventStore.ts'
import { Keyv } from '../../src/keyv.ts'
import * as SqlEventStore from '../../src/SqlEventStore.ts'
import { layer as sqlSensitiveDataStoreLayer } from '../../src/SqlSensitiveDataStore.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid, layer as uuidLayer } from '../../src/types/Uuid.ts'

const orcidWithVerified = OrcidId('0000-0002-1825-0097')
const orcidWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidWithNoEmailAddress = OrcidId('0000-0003-4921-6155')

const validVerificationToken = Uuid('27e501e5-bc25-4975-995a-b0e789ac0865')
const invalidVerificationToken = Uuid('784f7806-14a2-47dd-9801-00364bdf1829')

it.effect.each<
  [
    string,
    _.Input,
    Either.Either<void, _.Error>,
    'verified' | 'unverified' | 'does-not-exist',
    ReadonlyArray<Event['_tag']>,
  ]
>([
  [
    'currently unverified, valid token',
    { orcid: orcidWithUnverified, verificationToken: validVerificationToken },
    Either.void,
    'verified',
    ['ContactAddressImported'],
  ],
  [
    'currently unverified, invalid token',
    { orcid: orcidWithUnverified, verificationToken: invalidVerificationToken },
    Either.left(new VerificationTokenInvalid()),
    'unverified',
    [],
  ],
  [
    'no email address',
    { orcid: orcidWithNoEmailAddress, verificationToken: validVerificationToken },
    Either.left(new ContactEmailAddressIsNotFound()),
    'does-not-exist',
    [],
  ],
  [
    'already verified',
    { orcid: orcidWithVerified, verificationToken: validVerificationToken },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
    'verified',
    [],
  ],
])('%s', ([, input, expectedReturn, expectedState, expectedEvents]) =>
  Effect.gen(function* () {
    const store = new Keyv()

    const eventStore = yield* SqlEventStore.make

    yield* Effect.promise(() =>
      store.set(orcidWithUnverified, {
        type: 'unverified',
        verificationToken: validVerificationToken,
        value: 'foo@example.com',
      }),
    )
    yield* Effect.promise(() => store.set(orcidWithVerified, { type: 'verified', value: 'foo@example.com' }))

    const actualReturn = yield* Effect.either(
      _.VerifyContactEmailAddress(store)(input).pipe(Effect.provideService(EventStore, eventStore)),
    )
    const actualState = yield* Effect.promise(() => store.get(input.orcid))
    const actualEvents = yield* pipe(
      eventStore.all,
      Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      Effect.andThen(Array.map(Struct.get('_tag'))),
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    expect(actualState).toStrictEqual(
      expectedState === 'does-not-exist' ? undefined : expect.objectContaining({ type: expectedState }),
    )
    expect(actualEvents).toStrictEqual(expectedEvents)
  }).pipe(
    Effect.provide(sqlSensitiveDataStoreLayer),
    Effect.provide([
      uuidLayer,
      Layer.mock(Events, { publish: () => Effect.succeed(true) } as never),
      LibsqlClient.layer({ url: ':memory:' }),
    ]),
  ),
)
