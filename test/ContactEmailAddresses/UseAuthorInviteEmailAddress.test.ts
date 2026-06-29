import { LibsqlClient } from '@effect/sql-libsql'
import { expect, it } from '@effect/vitest'
import { Array, Effect, Either, Layer, Option, pipe, Struct } from 'effect'
import { ContactEmailAddressHasAlreadyBeenVerified } from '../../src/ContactEmailAddresses/index.ts'
import * as _ from '../../src/ContactEmailAddresses/UseAuthorInviteEmailAddress.ts'
import { type Event, Events } from '../../src/Events.ts'
import { EventStore } from '../../src/EventStore.ts'
import { Keyv } from '../../src/keyv.ts'
import { make as makeSqlEventStore } from '../../src/SqlEventStore.ts'
import { layer as sqlSensitiveDataStoreLayer } from '../../src/SqlSensitiveDataStore.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid, layer as uuidLayer } from '../../src/types/Uuid.ts'

const openInvitationId = Uuid('72ec8ae8-7f4f-4efa-9693-53e2772437be')
const acceptedInvitationId = Uuid('47c7ab91-0935-4b5c-9c50-b260047315b0')
const acceptedInvitationBySomeoneElseId = Uuid('7ce5f8a3-486d-474a-a91d-c0a80f50920c')
const declinedInvitation = Uuid('34828a99-32f6-4255-ae4f-610a943389b4')
const completedInvitation = Uuid('5c3d54ab-a5f1-41ca-9802-fe490c32602f')

const openInvitationEmailAddress = EmailAddress('open@example.com')
const acceptedInvitationEmailAddress = EmailAddress('accepted@example.com')
const acceptedInvitationBySomeoneElseEmailAddress = EmailAddress('accepted-someone-else@prereview.org')

const orcidIdWithNoEmailAddress = OrcidId('0000-0002-1825-0097')
const orcidIdWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidIdWithVerified = OrcidId('0000-0003-4921-6155')
const someoneElseOrcidId = OrcidId('0000-0002-5753-2556')

const existingUnverifiedEmailAddress = EmailAddress('unverified@example.com')
const existingVerifiedEmailAddress = EmailAddress('verified@example.com')

it.effect.each<
  [
    string,
    _.Input,
    Either.Either<void, _.Error>,
    ['verified' | 'unverified', EmailAddress] | undefined,
    ReadonlyArray<Event['_tag']>,
  ]
>([
  [
    'accepted invitation, no email address',
    { orcidId: orcidIdWithNoEmailAddress, inviteId: acceptedInvitationId },
    Either.void,
    ['verified', acceptedInvitationEmailAddress],
    ['AuthorInviteEmailAddressChosenAsContactAddress'],
  ],
  [
    'accepted invitation, unverified email address',
    { orcidId: orcidIdWithUnverified, inviteId: acceptedInvitationId },
    Either.void,
    ['verified', acceptedInvitationEmailAddress],
    ['AuthorInviteEmailAddressChosenAsContactAddress'],
  ],
  [
    'accepted invitation, verified email address',
    { orcidId: orcidIdWithVerified, inviteId: acceptedInvitationId },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
    ['verified', existingVerifiedEmailAddress],
    [],
  ],
  [
    'open invitation',
    { orcidId: orcidIdWithNoEmailAddress, inviteId: openInvitationId },
    Either.left(new _.AcceptedInvitationIsNotFound()),
    undefined,
    [],
  ],
  [
    'invitation accepted by someone else',
    { orcidId: orcidIdWithNoEmailAddress, inviteId: acceptedInvitationBySomeoneElseId },
    Either.left(new _.AcceptedInvitationIsNotFound()),
    undefined,
    [],
  ],
  [
    'declined invitation',
    { orcidId: orcidIdWithNoEmailAddress, inviteId: declinedInvitation },
    Either.left(new _.AcceptedInvitationIsNotFound()),
    undefined,
    [],
  ],
  [
    'completed invitation',
    { orcidId: orcidIdWithNoEmailAddress, inviteId: completedInvitation },
    Either.left(new _.AcceptedInvitationIsNotFound()),
    undefined,
    [],
  ],
])('%s', ([, input, expectedReturn, expectedState, expectedEvents]) =>
  Effect.gen(function* () {
    const contactEmailStore = new Keyv()
    const authorInviteStore = new Keyv()

    const eventStore = yield* makeSqlEventStore

    yield* Effect.promise(() =>
      contactEmailStore.set(orcidIdWithUnverified, {
        type: 'unverified',
        verificationToken: '982c8de0-5000-45cd-9f96-70fc12fe0bcb',
        value: existingUnverifiedEmailAddress,
      }),
    )
    yield* Effect.promise(() =>
      contactEmailStore.set(orcidIdWithVerified, { type: 'verified', value: existingVerifiedEmailAddress }),
    )
    yield* Effect.promise(() =>
      authorInviteStore.set(openInvitationId, {
        status: 'open',
        emailAddress: openInvitationEmailAddress,
        review: 1234,
      }),
    )
    yield* Effect.promise(() =>
      authorInviteStore.set(acceptedInvitationId, {
        status: 'assigned',
        emailAddress: acceptedInvitationEmailAddress,
        orcid: input.orcidId,
        review: 1234,
      }),
    )
    yield* Effect.promise(() =>
      authorInviteStore.set(acceptedInvitationBySomeoneElseId, {
        status: 'assigned',
        emailAddress: acceptedInvitationBySomeoneElseEmailAddress,
        orcid: someoneElseOrcidId,
        review: 1234,
      }),
    )
    yield* Effect.promise(() =>
      authorInviteStore.set(declinedInvitation, {
        status: 'declined',
        review: 1234,
      }),
    )
    yield* Effect.promise(() =>
      authorInviteStore.set(completedInvitation, {
        status: 'completed',
        orcid: input.orcidId,
        review: 1234,
      }),
    )

    const actualReturn = yield* Effect.either(
      _.UseAuthorInviteEmailAddress(
        contactEmailStore,
        authorInviteStore,
      )(input).pipe(Effect.provideService(EventStore, eventStore)),
    )
    const actualState = yield* Effect.promise(() => contactEmailStore.get(input.orcidId))
    const actualEvents = yield* pipe(
      eventStore.all,
      Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      Effect.andThen(Array.map(Struct.get('_tag'))),
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    if (expectedState) {
      expect(actualState).toStrictEqual(expect.objectContaining({ type: expectedState[0], value: expectedState[1] }))
    } else {
      expect(actualState).toBeUndefined()
    }
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
