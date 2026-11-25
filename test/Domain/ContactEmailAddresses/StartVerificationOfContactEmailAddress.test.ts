import { LibsqlClient } from '@effect/sql-libsql'
import { Array, Effect, Layer, Option, pipe, Result, Stream, Struct } from 'effect'
import { Locale } from '../../../src/Context.ts'
import { ContactEmailAddressHasAlreadyBeenVerified } from '../../../src/Domain/ContactEmailAddresses/index.ts'
import * as _ from '../../../src/Domain/ContactEmailAddresses/StartVerificationOfContactEmailAddress.ts'
import { ContactAddressImported, Event } from '../../../src/Domain/Events/Events.ts'
import { EventStore } from '../../../src/EventSourcing/EventStore.ts'
import { make as makeSqlEventStore } from '../../../src/EventSourcing/SqlEventStore.ts'
import { Email, OrcidRecords } from '../../../src/ExternalInteractions/index.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { layer as sqlSensitiveDataStoreLayer } from '../../../src/SensitiveData/SqlSensitiveDataStore.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { Uuid } from '../../../src/types/index.ts'
import { Name } from '../../../src/types/Name.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { expect, it, vi } from '../../vitest.ts'

const orcidIdWithNoEmailAddress = OrcidId('0000-0002-1825-0097')
const orcidIdWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidIdWithVerified = OrcidId('0000-0003-4921-6155')

const newEmailAddress = EmailAddress('new@example.com')
const existingUnverifiedEmailAddress = EmailAddress('unverified@example.com')
const existingVerifiedEmailAddress = EmailAddress('verified@example.com')

const name = Option.some(Name('Josiah Carberry'))

it.effect.each<[string, _.Input, Result.Result<void, _.Error>, boolean, ReadonlyArray<Event['_tag']>]>([
  [
    'no email address',
    { orcidId: orcidIdWithNoEmailAddress, emailAddress: newEmailAddress, resumeAt: '/resume' },
    Result.void,
    true,
    ['ContactAddressRecorded', 'EmailToVerifyContactAddressSent'],
  ],
  [
    'same as unverified email address',
    { orcidId: orcidIdWithUnverified, emailAddress: existingUnverifiedEmailAddress, resumeAt: '/resume' },
    Result.void,
    true,
    ['EmailToVerifyContactAddressSent'],
  ],
  [
    'different to unverified email address',
    { orcidId: orcidIdWithUnverified, emailAddress: newEmailAddress, resumeAt: '/resume' },
    Result.void,
    true,
    ['ContactAddressRecorded', 'EmailToVerifyContactAddressSent'],
  ],
  [
    'same as verified email address',
    { orcidId: orcidIdWithVerified, emailAddress: existingVerifiedEmailAddress, resumeAt: '/resume' },
    Result.fail(new ContactEmailAddressHasAlreadyBeenVerified()),
    false,
    [],
  ],
  [
    'different to verified email address',
    { orcidId: orcidIdWithVerified, emailAddress: newEmailAddress, resumeAt: '/resume' },
    Result.void,
    true,
    ['ContactAddressRecorded', 'EmailToVerifyContactAddressSent'],
  ],
])('%s', ([, input, expectedReturn, expectedEmail, expectedEvents]) =>
  Effect.gen(function* () {
    const eventStore = yield* makeSqlEventStore(Event)

    yield* Effect.forEach(
      [
        new ContactAddressImported({
          orcidId: orcidIdWithUnverified,
          contactAddressId: Uuid.Uuid('982c8de0-5000-45cd-9f96-70fc12fe0bcb'),
          emailAddress: Option.some(existingUnverifiedEmailAddress),
          verificationStatus: 'unverified',
        }),
        new ContactAddressImported({
          orcidId: orcidIdWithVerified,
          contactAddressId: Uuid.Uuid('a6eab1d8-0a13-45cc-8868-730c6ef0c6f1'),
          emailAddress: Option.some(existingVerifiedEmailAddress),
          verificationStatus: 'verified',
        }),
      ],
      eventStore.append,
    )
    const cursor = yield* eventStore.latestCursor

    const verifyContactEmailAddress = vi.fn<(typeof Email.Email.Service)['verifyContactEmailAddress']>(
      () => Effect.void,
    )

    const actualReturn = yield* Effect.result(
      Effect.provide(_.StartVerificationOfContactEmailAddress(input), [
        Layer.mock(Email.Email, { verifyContactEmailAddress }),
        Layer.succeed(EventStore, eventStore),
      ]),
    )
    const actualEvents = yield* pipe(
      Stream.runCollect(eventStore.since(cursor)),
      Effect.map(Array.flatMap(Array.map(Struct.get('event')))),
      Effect.map(Array.map(event => event._tag)),
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    if (expectedEmail) {
      expect(verifyContactEmailAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          name,
          emailAddress: expect.objectContaining({ value: input.emailAddress }),
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
      Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) }),
      LibsqlClient.layer({ url: ':memory:' }),
      Uuid.layer,
    ]),
  ),
)
