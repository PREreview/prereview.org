import { Array, Either, Equal, HashSet, Option, Struct, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { EmailAddress, NonEmptyString, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
}

export interface InvitationToAppear {
  invitationId: Uuid.Uuid
  name: NonEmptyString.NonEmptyString
  emailAddress: EmailAddress.EmailAddress
}

export type Result = Either.Either<
  ReadonlyArray<InvitationToAppear>,
  Errors.DatasetReviewHasNotBeenStarted | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
>

const createFilter = ({ datasetReviewId }: Input) =>
  Events.EventFilter({
    types: [
      'DatasetReviewWasStarted',
      'AnsweredIfOthersNeedToBeListedOnTheReview',
      'InvitationToAppearOnADatasetReviewAddedToTheList',
      'InvitationToAppearOnADatasetReviewRemovedFromTheList',
    ],
    predicates: { datasetReviewId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    yield* Either.fromOption(
      Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')),
      () => new Errors.DatasetReviewHasNotBeenStarted(),
    )

    const needInvitations = Option.map(
      Array.findLast(filteredEvents, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview')),
      Struct.get('answer'),
    )

    if (!Equal.equals(needInvitations, Option.some('yes'))) {
      return yield* Either.left(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear())
    }

    const addedInvitations = Array.filter(events, hasTag('InvitationToAppearOnADatasetReviewAddedToTheList'))

    const removedInvitations = HashSet.fromIterable(
      Array.filterMap(events, event =>
        event._tag === 'InvitationToAppearOnADatasetReviewRemovedFromTheList'
          ? Option.some(event.invitationId)
          : Option.none(),
      ),
    )

    const currentInvitations = Array.filter(
      addedInvitations,
      invitation => !HashSet.has(removedInvitations, invitation.invitationId),
    )

    return Array.filterMap(currentInvitations, invitation =>
      Option.map(invitation.contactDetails, contactDetails => ({
        invitationId: invitation.invitationId,
        name: contactDetails.name,
        emailAddress: contactDetails.emailAddress,
      })),
    )
  })

export const GetListOfInvitationsToAppearOnADatasetReview = Queries.OnDemandQuery({
  name: 'DatasetReviewQueries.getListOfInvitationsToAppearOnADatasetReview',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
