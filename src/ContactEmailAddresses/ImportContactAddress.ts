import { Array, Data, Either, Equal, Match, Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly contactAddressId: Uuid
  readonly emailAddress: EmailAddress
  readonly orcidId: OrcidId
  readonly verificationStatus: 'verified' | 'unverified'
}

export class ContactAddressIdHasAlreadyBeenUsed extends Data.TaggedError('ContactAddressIdHasAlreadyBeenUsed') {}

export class DetailsDoNotMatchExistingImport extends Data.TaggedError('DetailsDoNotMatchExistingImport') {}

export type Error = ContactAddressIdHasAlreadyBeenUsed | DetailsDoNotMatchExistingImport

export interface State {
  contactIdInUse: boolean
  contactAddress?: {
    emailAddress: Option.Option<EmailAddress>
    orcidId: OrcidId
    verificationStatus: 'verified' | 'unverified'
  }
}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: ['ContactAddressImported', 'ContactAddressVerified'],
    predicates: { contactAddressId: input.contactAddressId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const contactIdInUse = Array.isNonEmptyArray(filteredEvents)

  const contactAddress = Array.reduce(
    filteredEvents,
    Option.none<{
      emailAddress: Option.Option<EmailAddress>
      orcidId: OrcidId
      verificationStatus: 'verified' | 'unverified'
    }>(),
    (state, event) =>
      Match.valueTags(event, {
        ContactAddressImported: event =>
          Option.some({
            emailAddress: event.emailAddress,
            orcidId: event.orcidId,
            verificationStatus: event.verificationStatus,
          }),
        ContactAddressVerified: () =>
          Option.map(state, contactAddress => ({
            ...contactAddress,
            verificationStatus: 'verified' as const,
          })),
      }),
  )

  return { contactIdInUse, contactAddress: Option.getOrUndefined(contactAddress) }
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> => {
  if (!state.contactAddress && !state.contactIdInUse) {
    return Either.right(
      Option.some(new Events.ContactAddressImported({ ...input, emailAddress: Option.some(input.emailAddress) })),
    )
  }

  if (state.contactIdInUse && !state.contactAddress) {
    return Either.left(new ContactAddressIdHasAlreadyBeenUsed())
  }

  if (
    state.contactAddress &&
    (!Equal.equals(state.contactAddress.emailAddress, Option.some(input.emailAddress)) ||
      state.contactAddress.orcidId !== input.orcidId ||
      state.contactAddress.verificationStatus !== input.verificationStatus)
  ) {
    return Either.left(new DetailsDoNotMatchExistingImport())
  }

  return Either.right(Option.none())
}

export const ImportContactAddress: Commands.Command<[Input], State, Error> = Commands.Command({
  name: 'ContactEmailAddresses.importContactAddress',
  createFilter,
  foldState,
  decide,
})
