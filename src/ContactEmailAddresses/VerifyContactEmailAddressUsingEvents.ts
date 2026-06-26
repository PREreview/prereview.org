import { Array, Data, Either, Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import { ContactEmailAddressHasAlreadyBeenVerified, ContactEmailAddressIsNotFound } from './Errors.ts'

export interface Input {
  orcid: OrcidId
  contactAddressId: Uuid
  verifiedAt: Temporal.Instant
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | ContactEmailAddressIsNotFound

class ContactAddressUnverified extends Data.TaggedClass('ContactAddressUnverified') {}

type State = ContactAddressUnverified | ContactEmailAddressHasAlreadyBeenVerified | ContactEmailAddressIsNotFound

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['ContactAddressImported', 'ContactAddressVerified'],
      predicates: { contactAddressId: input.contactAddressId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const importStatus = Array.findLast(filteredEvents, event => event._tag === 'ContactAddressImported')

  if (Option.isNone(importStatus)) {
    return new ContactEmailAddressIsNotFound()
  }

  if (importStatus.value.verificationStatus.status === 'verified') {
    return new ContactEmailAddressHasAlreadyBeenVerified()
  }

  if (Array.some(filteredEvents, event => event._tag === 'ContactAddressVerified')) {
    return new ContactEmailAddressHasAlreadyBeenVerified()
  }

  return new ContactAddressUnverified()
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> => {
  if (state._tag === 'ContactEmailAddressIsNotFound') {
    return Either.left(state)
  }

  if (state._tag === 'ContactEmailAddressHasAlreadyBeenVerified') {
    return Either.left(state)
  }

  return Either.right(
    Option.some(
      new Events.ContactAddressVerified({ contactAddressId: input.contactAddressId, verifiedAt: input.verifiedAt }),
    ),
  )
}

export const VerifyContactEmailAddressUsingEvents: Commands.Command<
  'ContactAddressImported' | 'ContactAddressVerified',
  [Input],
  State,
  Error
> = Commands.Command({
  name: 'ContactEmailAddresses.importContactAddress',
  createFilter,
  foldState,
  decide,
})
