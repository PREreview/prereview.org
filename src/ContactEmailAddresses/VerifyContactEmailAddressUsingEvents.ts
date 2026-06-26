import { Array, Data, Either, Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import {
  ContactEmailAddressHasAlreadyBeenVerified,
  ContactEmailAddressIsNotFound,
  type OnlyCurrentContactAddressCanBeVerified,
} from './Errors.ts'

export interface Input {
  orcid: OrcidId
  contactAddressId: Uuid
  verifiedAt: Temporal.Instant
}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | ContactEmailAddressIsNotFound
  | OnlyCurrentContactAddressCanBeVerified

class ContactAddressUnverified extends Data.TaggedClass('ContactAddressUnverified')<{ orcidId: OrcidId }> {}
class ContactAddressVerified extends Data.TaggedClass('ContactAddressVerified')<{ orcidId: OrcidId }> {}

type State = ContactAddressUnverified | ContactAddressVerified | ContactEmailAddressIsNotFound

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['ContactAddressImported', 'ContactAddressRecorded', 'ContactAddressVerified'],
      predicates: { contactAddressId: input.contactAddressId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const originEvent = Array.findLast(
    filteredEvents,
    event => event._tag === 'ContactAddressImported' || event._tag === 'ContactAddressRecorded',
  )

  if (Option.isNone(originEvent)) {
    return new ContactEmailAddressIsNotFound()
  }

  if (originEvent.value._tag === 'ContactAddressImported' && originEvent.value.verificationStatus === 'verified') {
    return new ContactAddressVerified({ orcidId: originEvent.value.orcidId })
  }

  if (Array.some(filteredEvents, event => event._tag === 'ContactAddressVerified')) {
    return new ContactAddressVerified({ orcidId: originEvent.value.orcidId })
  }

  return new ContactAddressUnverified({ orcidId: originEvent.value.orcidId })
}

const authorize = (state: State, input: Input): boolean => {
  if (state._tag === 'ContactEmailAddressIsNotFound') {
    return true
  }

  return state.orcidId === input.orcid
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> => {
  if (state._tag === 'ContactEmailAddressIsNotFound') {
    return Either.left(state)
  }

  if (state._tag === 'ContactAddressVerified') {
    return Either.left(new ContactEmailAddressHasAlreadyBeenVerified())
  }

  return Either.right(
    Option.some(
      new Events.ContactAddressVerified({ contactAddressId: input.contactAddressId, verifiedAt: input.verifiedAt }),
    ),
  )
}

export const VerifyContactEmailAddressUsingEvents = Commands.Command<
  'ContactAddressImported' | 'ContactAddressRecorded' | 'ContactAddressVerified',
  [Input],
  State,
  Error,
  true
>({
  name: 'ContactEmailAddresses.importContactAddress',
  createFilter,
  foldState,
  authorize,
  decide,
})
