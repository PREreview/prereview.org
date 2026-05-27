import { Array, Either, Equal, Option, Struct, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { NonEmptyString, OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
  authorId: OrcidId.OrcidId
}

export type Result = Either.Either<
  NonEmptyString.NonEmptyString,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
  | Errors.DatasetReviewInvitationNotInList
>

const createFilter = ({ datasetReviewId }: Input) =>
  Events.EventFilter({
    types: [
      'DatasetReviewWasStarted',
      'AnsweredIfOthersNeedToBeListedOnTheReview',
      'InvitationToAppearOnADatasetReviewAddedToTheList',
      'InvitationToAppearOnADatasetReviewRemovedFromTheList',
      'PublicationOfDatasetReviewWasRequested',
      'DatasetReviewWasPublished',
    ],
    predicates: { datasetReviewId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const started = yield* Either.fromOption(
      Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')),
      () => new Errors.DatasetReviewHasNotBeenStarted(),
    )

    if (!Equal.equals(started.authorId, input.authorId)) {
      return yield* Either.left(new Errors.DatasetReviewWasStartedByAnotherUser())
    }

    if (Array.some(filteredEvents, hasTag('DatasetReviewWasPublished'))) {
      return yield* Either.left(new Errors.DatasetReviewHasBeenPublished())
    }

    if (Array.some(filteredEvents, hasTag('PublicationOfDatasetReviewWasRequested'))) {
      return yield* Either.left(new Errors.DatasetReviewIsBeingPublished())
    }

    const needInvitations = Option.map(
      Array.findLast(filteredEvents, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview')),
      Struct.get('answer'),
    )

    if (!Equal.equals(needInvitations, Option.some('yes'))) {
      return yield* Either.left(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear())
    }

    if (
      Array.some(
        events,
        event =>
          event._tag === 'InvitationToAppearOnADatasetReviewRemovedFromTheList' &&
          Equal.equals(event.invitationId, input.invitationId),
      )
    ) {
      return yield* Either.left(new Errors.DatasetReviewInvitationNotInList())
    }

    const added = Array.findLast(
      events,
      (event): event is Events.InvitationToAppearOnADatasetReviewAddedToTheList =>
        event._tag === 'InvitationToAppearOnADatasetReviewAddedToTheList' &&
        Equal.equals(event.invitationId, input.invitationId),
    )

    if (Option.isNone(added) || Option.isNone(added.value.contactDetails)) {
      return yield* Either.left(new Errors.DatasetReviewInvitationNotInList())
    }

    return added.value.contactDetails.value.name
  })

export const CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList = Queries.OnDemandQuery({
  name: 'DatasetReviewQueries.checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
