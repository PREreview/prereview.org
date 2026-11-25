import { LibsqlClient } from '@effect/sql-libsql'
import { Array, Effect, pipe, Result, Stream, Struct } from 'effect'
import * as AuthorInviteStore from '../../../src/AuthorInviteStore.ts'
import * as _ from '../../../src/Domain/ContactEmailAddresses/UseAuthorInviteEmailAddress.ts'
import { Event } from '../../../src/Domain/Events/Events.ts'
import { EventStore } from '../../../src/EventSourcing/EventStore.ts'
import { make as makeSqlEventStore } from '../../../src/EventSourcing/SqlEventStore.ts'
import { layer as sqlSensitiveDataStoreLayer } from '../../../src/SensitiveData/SqlSensitiveDataStore.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid, layer as uuidLayer } from '../../../src/types/Uuid.ts'
import { expect, it } from '../../vitest.ts'

const openInvitationId = Uuid('72ec8ae8-7f4f-4efa-9693-53e2772437be')
const acceptedInvitationId = Uuid('47c7ab91-0935-4b5c-9c50-b260047315b0')
const acceptedInvitationBySomeoneElseId = Uuid('7ce5f8a3-486d-474a-a91d-c0a80f50920c')
const declinedInvitation = Uuid('34828a99-32f6-4255-ae4f-610a943389b4')
const completedInvitation = Uuid('5c3d54ab-a5f1-41ca-9802-fe490c32602f')

const openInvitationEmailAddress = EmailAddress('open@example.com')
const acceptedInvitationEmailAddress = EmailAddress('accepted@example.com')
const acceptedInvitationBySomeoneElseEmailAddress = EmailAddress('accepted-someone-else@prereview.org')

const orcidId = OrcidId('0000-0002-1825-0097')
const someoneElseOrcidId = OrcidId('0000-0002-5753-2556')

it.effect.each<[string, _.Input, Result.Result<void, _.Error>, ReadonlyArray<Event['_tag']>]>([
  [
    'accepted invitation, no email address',
    { orcidId, inviteId: acceptedInvitationId },
    Result.void,
    ['AuthorInviteEmailAddressChosenAsContactAddress'],
  ],
  [
    'accepted invitation, unverified email address',
    { orcidId, inviteId: acceptedInvitationId },
    Result.void,
    ['AuthorInviteEmailAddressChosenAsContactAddress'],
  ],
  ['open invitation', { orcidId, inviteId: openInvitationId }, Result.fail(new _.AcceptedInvitationIsNotFound()), []],
  [
    'invitation accepted by someone else',
    { orcidId, inviteId: acceptedInvitationBySomeoneElseId },
    Result.fail(new _.AcceptedInvitationIsNotFound()),
    [],
  ],
  [
    'declined invitation',
    { orcidId, inviteId: declinedInvitation },
    Result.fail(new _.AcceptedInvitationIsNotFound()),
    [],
  ],
  [
    'completed invitation',
    { orcidId, inviteId: completedInvitation },
    Result.fail(new _.AcceptedInvitationIsNotFound()),
    [],
  ],
])('%s', ([, input, expectedReturn, expectedEvents]) =>
  Effect.gen(function* () {
    const eventStore = yield* makeSqlEventStore(Event)

    yield* AuthorInviteStore.save(openInvitationId, {
      status: 'open',
      emailAddress: openInvitationEmailAddress,
      review: 1234,
    })
    yield* AuthorInviteStore.save(acceptedInvitationId, {
      status: 'assigned',
      emailAddress: acceptedInvitationEmailAddress,
      orcid: input.orcidId,
      review: 1234,
    })
    yield* AuthorInviteStore.save(acceptedInvitationBySomeoneElseId, {
      status: 'assigned',
      emailAddress: acceptedInvitationBySomeoneElseEmailAddress,
      orcid: someoneElseOrcidId,
      review: 1234,
    })
    yield* AuthorInviteStore.save(declinedInvitation, {
      status: 'declined',
      review: 1234,
    })
    yield* AuthorInviteStore.save(completedInvitation, {
      status: 'completed',
      orcid: input.orcidId,
      review: 1234,
    })

    const actualReturn = yield* Effect.result(
      _.UseAuthorInviteEmailAddress(input).pipe(Effect.provideService(EventStore, eventStore)),
    )
    const actualEvents = yield* pipe(
      Stream.runCollect(eventStore.all),
      Effect.map(Array.flatMap(Array.map(Struct.get('event')))),
      Effect.map(Array.map(event => event._tag)),
    )

    expect(actualReturn).toStrictEqual(expectedReturn)
    expect(actualEvents).toStrictEqual(expectedEvents)
  }).pipe(
    Effect.provide(sqlSensitiveDataStoreLayer),
    Effect.provide([AuthorInviteStore.layerInMemory, uuidLayer, LibsqlClient.layer({ url: ':memory:' })]),
  ),
)
