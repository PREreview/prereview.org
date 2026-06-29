import { LibsqlClient } from '@effect/sql-libsql'
import { expect, it, vi } from '@effect/vitest'
import { Array, Effect, Either, Layer, Option, Struct, pipe } from 'effect'
import {
  ContactEmailAddressHasAlreadyBeenVerified,
  ContactEmailAddressIsNotFound,
} from '../../src/ContactEmailAddresses/index.ts'
import * as _ from '../../src/ContactEmailAddresses/ResendVerificationEmail.ts'
import { Locale } from '../../src/Context.ts'
import { Events, type Event } from '../../src/Events.ts'
import { EventStore } from '../../src/EventStore.ts'
import { Email, OrcidRecords } from '../../src/ExternalInteractions/index.ts'
import { Keyv } from '../../src/keyv.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { make as makeSqlEventStore } from '../../src/SqlEventStore.ts'
import { layer as sqlSensitiveDataStoreLayer } from '../../src/SqlSensitiveDataStore.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { Uuid } from '../../src/types/index.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'

const orcidIdWithNoEmailAddress = OrcidId('0000-0002-1825-0097')
const orcidIdWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidIdWithVerified = OrcidId('0000-0003-4921-6155')

const existingUnverifiedEmailAddress = EmailAddress('unverified@example.com')
const existingVerifiedEmailAddress = EmailAddress('verified@example.com')

const name = Name('Josiah Carberry')

it.effect.each<[string, _.Input, Either.Either<void, _.Error>, EmailAddress | undefined, ReadonlyArray<Event['_tag']>]>(
  [
    [
      'no email address',
      { orcidId: orcidIdWithNoEmailAddress, resumeAt: '/resume' },
      Either.left(new ContactEmailAddressIsNotFound()),
      undefined,
      [],
    ],
    [
      'unverified email address',
      { orcidId: orcidIdWithUnverified, resumeAt: '/resume' },
      Either.void,
      existingUnverifiedEmailAddress,
      [],
    ],
    [
      'verified email address',
      { orcidId: orcidIdWithVerified, resumeAt: '/resume' },
      Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
      undefined,
      [],
    ],
  ],
)('%s', ([, input, expectedReturn, expectedEmail, expectedEvents]) =>
  Effect.gen(function* () {
    const store = new Keyv()

    const eventStore = yield* makeSqlEventStore

    yield* Effect.promise(() =>
      store.set(orcidIdWithUnverified, {
        type: 'unverified',
        verificationToken: '982c8de0-5000-45cd-9f96-70fc12fe0bcb',
        value: existingUnverifiedEmailAddress,
      }),
    )
    yield* Effect.promise(() =>
      store.set(orcidIdWithVerified, { type: 'verified', value: existingVerifiedEmailAddress }),
    )

    const verifyContactEmailAddress = vi.fn<(typeof Email.Email.Service)['verifyContactEmailAddress']>(_ => Effect.void)

    const actualReturn = yield* Effect.either(
      Effect.provide(_.ResendVerificationEmail(store)(input), [
        Layer.mock(Email.Email, { verifyContactEmailAddress }),
        Layer.succeed(EventStore, eventStore),
      ]),
    )
    const actualEvents = yield* pipe(
      eventStore.all,
      Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      Effect.andThen(Array.map(Struct.get('_tag'))),
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    if (expectedEmail) {
      expect(verifyContactEmailAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          name,
          emailAddress: expect.objectContaining({ value: expectedEmail }),
          redirectTo: input.resumeAt,
        }),
      )
    } else {
      expect(verifyContactEmailAddress).not.toHaveBeenCalled()
    }
    expect(actualEvents).toStrictEqual(expectedEvents)
  }).pipe(
    Effect.provide(sqlSensitiveDataStoreLayer),
    Effect.provide([
      Layer.succeed(Locale, DefaultLocale),
      Layer.mock(Events, { publish: () => Effect.succeed(true) } as never),
      LibsqlClient.layer({ url: ':memory:' }),
      Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) }),
      Uuid.layer,
    ]),
  ),
)
