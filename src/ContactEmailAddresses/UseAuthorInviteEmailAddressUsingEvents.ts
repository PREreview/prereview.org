import type { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Match, Option, pipe, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import { AcceptedInvitationIsNotFound, ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly inviteId: Uuid
  readonly chosenAt: Temporal.Instant
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | AcceptedInvitationIsNotFound

interface State {
  invitation?: { emailAddress: EmailAddress; acceptedBy?: OrcidId }
  contactAddress?: {
    emailAddress: EmailAddress
    verificationStatus: 'verified' | 'unverified'
  }
}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['InvitationToAppearOnADatasetReviewAddedToTheList', 'AuthorInviteAccepted'],
      predicate: { invitationId: input.inviteId },
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

  const invitation: State['invitation'] = pipe(
    Array.findLast(filteredEvents, hasTag('InvitationToAppearOnADatasetReviewAddedToTheList')),
    Option.andThen(added => added.contactDetails),
    Option.match({
      onNone: () => undefined,
      onSome: contactDetails =>
        Option.match(Array.findLast(filteredEvents, hasTag('AuthorInviteAccepted')), {
          onNone: () => ({ _tag: 'NotAccepted', emailAddress: contactDetails.emailAddress }),
          onSome: accepted => ({
            _tag: 'Accepted',
            acceptedBy: accepted.orcidId,
            emailAddress: contactDetails.emailAddress,
          }),
        }),
    }),
  )

  const contactAddress: State['contactAddress'] = pipe(
    Array.findLast(
      filteredEvents,
      hasTag(
        'ContactAddressImported',
        'ContactAddressRecorded',
        'ContactAddressVerified',
        'AuthorInviteEmailAddressChosenAsContactAddress',
      ),
    ),
    Option.andThen(
      Match.valueTags({
        ContactAddressImported: imported =>
          Option.andThen(imported.emailAddress, emailAddress => ({
            emailAddress,
            verificationStatus: imported.verificationStatus,
          })),
        ContactAddressRecorded: recorded =>
          Option.andThen(recorded.emailAddress, emailAddress => ({
            emailAddress,
            verificationStatus: 'unverified' as const,
          })),
        ContactAddressVerified: verified =>
          pipe(
            Array.findLast(
              filteredEvents,
              (event): event is Events.ContactAddressImported | Events.ContactAddressRecorded =>
                (event._tag === 'ContactAddressImported' || event._tag === 'ContactAddressRecorded') &&
                event.contactAddressId === verified.contactAddressId,
            ),
            Option.andThen(recorded => recorded.emailAddress),
            Option.andThen(emailAddress => ({
              emailAddress,
              verificationStatus: 'verified' as const,
            })),
          ),
        AuthorInviteEmailAddressChosenAsContactAddress: chosen =>
          Option.andThen(chosen.emailAddress, emailAddress => ({
            emailAddress,
            verificationStatus: 'verified' as const,
          })),
      }),
    ),
    Option.getOrUndefined,
  )

  return { invitation, contactAddress }
}

const authorize = (state: State, input: Input): boolean => {
  if (state.invitation?.acceptedBy && state.invitation.acceptedBy !== input.orcidId) {
    return false
  }

  return true
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Either.gen(function* () {
    if (!state.invitation?.acceptedBy) {
      return yield* Either.left(new AcceptedInvitationIsNotFound())
    }

    if (state.contactAddress?.verificationStatus === 'verified') {
      return yield* Either.left(new ContactEmailAddressHasAlreadyBeenVerified())
    }

    return Option.some(
      new Events.AuthorInviteEmailAddressChosenAsContactAddress({
        inviteId: input.inviteId,
        orcidId: input.orcidId,
        emailAddress: Option.some(state.invitation.emailAddress),
        chosenAt: input.chosenAt,
      }),
    )
  })

export const UseAuthorInviteEmailAddressUsingEvents = Commands.Command<[Input], State, Error, true>({
  name: 'ContactEmailAddresses.useAuthorInviteEmailAddress',
  createFilter,
  foldState,
  authorize,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
