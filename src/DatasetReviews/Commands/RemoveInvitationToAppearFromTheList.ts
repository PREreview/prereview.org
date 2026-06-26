import { Array, Data, Either, Equal, Match, Option, Struct, type Types } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly invitationId: Uuid.Uuid
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

type State =
  | NotStarted
  | DoesNotNeedInvitationsToAppear
  | HasNotBeenAdded
  | HasBeenAdded
  | IsBeingPublished
  | HasBeenPublished

class NotStarted extends Data.TaggedClass('NotStarted') {}

class DoesNotNeedInvitationsToAppear extends Data.TaggedClass('DoesNotNeedInvitationsToAppear')<{
  authorId: OrcidId.OrcidId
}> {}

class HasNotBeenAdded extends Data.TaggedClass('HasNotBeenAdded')<{ authorId: OrcidId.OrcidId }> {}

class HasBeenAdded extends Data.TaggedClass('HasBeenAdded')<{ authorId: OrcidId.OrcidId }> {}

class IsBeingPublished extends Data.TaggedClass('IsBeingPublished')<{ authorId: OrcidId.OrcidId }> {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished')<{ authorId: OrcidId.OrcidId }> {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: [
        'DatasetReviewWasStarted',
        'AnsweredIfOthersNeedToBeListedOnTheReview',
        'InvitationToAppearOnADatasetReviewAddedToTheList',
        'InvitationToAppearOnADatasetReviewRemovedFromTheList',
        'PublicationOfDatasetReviewWasRequested',
        'DatasetReviewWasPublished',
      ],
      predicates: { datasetReviewId: input.datasetReviewId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  return Option.match(Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')), {
    onNone: () => new NotStarted(),
    onSome: ({ authorId }) => {
      if (Array.some(filteredEvents, hasTag('DatasetReviewWasPublished'))) {
        return new HasBeenPublished({ authorId })
      }

      if (Array.some(filteredEvents, hasTag('PublicationOfDatasetReviewWasRequested'))) {
        return new IsBeingPublished({ authorId })
      }

      const needToBeListed = Option.match(
        Array.findLast(filteredEvents, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview')),
        {
          onNone: () => 'no' as const,
          onSome: Struct.get('answer'),
        },
      )

      if (needToBeListed === 'no') {
        return new DoesNotNeedInvitationsToAppear({ authorId })
      }

      if (
        Array.some(
          events,
          event =>
            event._tag === 'InvitationToAppearOnADatasetReviewRemovedFromTheList' &&
            Equal.equals(event.invitationId, input.invitationId),
        )
      ) {
        return new HasNotBeenAdded({ authorId })
      }

      if (
        Array.some(
          events,
          event =>
            event._tag === 'InvitationToAppearOnADatasetReviewAddedToTheList' &&
            Equal.equals(event.invitationId, input.invitationId),
        )
      ) {
        return new HasBeenAdded({ authorId })
      }

      return new HasNotBeenAdded({ authorId })
    },
  })
}

const authorize = (state: State, input: Input): boolean =>
  state._tag === 'NotStarted' || Equal.equals(state.authorId, input.userId)

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    NotStarted: () => Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
    IsBeingPublished: () => Either.left(new Errors.DatasetReviewIsBeingPublished()),
    HasBeenPublished: () => Either.left(new Errors.DatasetReviewHasBeenPublished()),
    DoesNotNeedInvitationsToAppear: () => Either.left(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear()),
    HasNotBeenAdded: () => Either.right(Option.none()),
    HasBeenAdded: () =>
      Either.right(Option.some(new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList(input))),
  })

export const RemoveInvitationToAppearFromTheList = Commands.Command<[Input], State, Error, true>({
  name: 'DatasetReviews.removeInvitationToAppearFromTheList',
  createFilter,
  foldState,
  authorize,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
