import { Array, Either, Match, Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import { EmailAddressEquivalence, type EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import { ContactAddressIdHasAlreadyBeenUsed, ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'

export interface Input {
  readonly contactAddressId: Uuid
  readonly emailAddress: EmailAddress
  readonly orcidId: OrcidId
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | ContactAddressIdHasAlreadyBeenUsed

export interface State {
  contactIdInUse: boolean
  contactAddress?: {
    contactAddressId?: Uuid
    orcidId: OrcidId
    emailAddress: Option.Option<EmailAddress>
    verificationStatus: 'verified' | 'unverified'
  }
}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['ContactAddressImported', 'ContactAddressRecorded', 'ContactAddressVerified'],
      predicates: { contactAddressId: input.contactAddressId },
    },
    {
      types: [
        'ContactAddressImported',
        'ContactAddressRecorded',
        'ContactAddressVerified',
        'AuthorInviteEmailAddressChosenAsContactAddress',
      ],
      predicates: { orcidId: input.orcidId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const contactIdInUse = Array.some(
    filteredEvents,
    event =>
      event._tag !== 'AuthorInviteEmailAddressChosenAsContactAddress' &&
      event.contactAddressId === input.contactAddressId,
  )

  const contactAddress = Array.reduce(
    filteredEvents,
    Option.none<{
      emailAddress: Option.Option<EmailAddress>
      orcidId: OrcidId
      verificationStatus: 'verified' | 'unverified'
    }>(),
    (state, event) =>
      event.orcidId === input.orcidId
        ? Match.valueTags(event, {
            ContactAddressImported: event =>
              Option.some({
                contactAddressId: event.contactAddressId,
                emailAddress: event.emailAddress,
                orcidId: event.orcidId,
                verificationStatus: event.verificationStatus,
              }),
            ContactAddressRecorded: event =>
              Option.some({
                contactAddressId: event.contactAddressId,
                emailAddress: event.emailAddress,
                orcidId: event.orcidId,
                verificationStatus: 'unverified' as const,
              }),
            ContactAddressVerified: () =>
              Option.map(state, contactAddress => ({
                ...contactAddress,
                verificationStatus: 'verified' as const,
              })),
            AuthorInviteEmailAddressChosenAsContactAddress: event =>
              Option.some({
                emailAddress: event.emailAddress,
                orcidId: event.orcidId,
                verificationStatus: 'verified' as const,
              }),
          })
        : state,
  )

  return { contactIdInUse, contactAddress: Option.getOrUndefined(contactAddress) }
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> => {
  if (state.contactIdInUse) {
    return Either.left(new ContactAddressIdHasAlreadyBeenUsed())
  }

  if (!state.contactAddress || Option.isNone(state.contactAddress.emailAddress)) {
    return Either.right(
      Option.some(new Events.ContactAddressRecorded({ ...input, emailAddress: Option.some(input.emailAddress) })),
    )
  }

  if (EmailAddressEquivalence(state.contactAddress.emailAddress.value, input.emailAddress)) {
    if (state.contactAddress.verificationStatus === 'verified') {
      return Either.left(new ContactEmailAddressHasAlreadyBeenVerified())
    }

    return Either.right(Option.none())
  }

  return Either.right(
    Option.some(new Events.ContactAddressRecorded({ ...input, emailAddress: Option.some(input.emailAddress) })),
  )
}

export const RecordContactAddress = Commands.Command({
  name: 'ContactEmailAddresses.recordContactAddress',
  createFilter,
  foldState,
  decide,
})
