import { Array, Result, Match, Option, Struct } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { EmailAddress } from '../../types/EmailAddress.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'
import {
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
  type ContactEmailAddress,
} from './ContactEmailAddress.ts'
import { ContactEmailAddressIsNotFound } from './Errors.ts'

export type Input = OrcidId

export type Result = Result.Result<ContactEmailAddress, Error>

export type Error = ContactEmailAddressIsNotFound

const createFilter = (orcidId: Input) =>
  Events.EventFilter({
    types: [
      'ContactAddressImported',
      'ContactAddressRecorded',
      'ContactAddressVerified',
      'AuthorInviteEmailAddressChosenAsContactAddress',
    ],
    predicates: { orcidId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    if (!Array.isReadonlyArrayNonEmpty(filteredEvents)) {
      return yield* Result.fail(new ContactEmailAddressIsNotFound())
    }

    const state:
      | {
          readonly status: 'verified'
          readonly contactAddressId?: Uuid
          readonly emailAddress: Option.Option<EmailAddress>
        }
      | {
          readonly status: 'unverified'
          readonly contactAddressId: Uuid
          readonly emailAddress: Option.Option<EmailAddress>
        } = Match.valueTags(Array.lastNonEmpty(filteredEvents), {
      ContactAddressImported: event => ({
        status: event.verificationStatus,
        contactAddressId: event.contactAddressId,
        emailAddress: event.emailAddress,
      }),
      ContactAddressRecorded: event => ({
        status: 'unverified' as const,
        contactAddressId: event.contactAddressId,
        emailAddress: event.emailAddress,
      }),
      ContactAddressVerified: verifiedEvent => ({
        status: 'verified' as const,
        contactAddressId: verifiedEvent.contactAddressId,
        emailAddress: Option.andThen(
          Array.findLast(
            filteredEvents,
            (event): event is Events.ContactAddressRecorded | Events.ContactAddressImported =>
              (event._tag === 'ContactAddressRecorded' || event._tag === 'ContactAddressImported') &&
              event.contactAddressId === verifiedEvent.contactAddressId,
          ),
          Struct.get('emailAddress'),
        ),
      }),
      AuthorInviteEmailAddressChosenAsContactAddress: event => ({
        status: 'verified' as const,
        emailAddress: event.emailAddress,
      }),
    })

    return yield* Option.match(state.emailAddress, {
      onNone: () => Result.fail(new ContactEmailAddressIsNotFound()),
      onSome: emailAddress =>
        Result.succeed(
          state.status === 'verified'
            ? new VerifiedContactEmailAddress({ value: emailAddress, contactAddressId: state.contactAddressId })
            : new UnverifiedContactEmailAddress({ value: emailAddress, contactAddressId: state.contactAddressId }),
        ),
    })
  })

export const GetContactEmailAddress = Queries.OnDemandQuery({
  name: 'ContactEmailAddresses.getContactEmailAddress',
  createFilter,
  query,
})
