import { Array, Boolean, Data, Either, Equal, Match, Option, type Types } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly answer: 'yes' | 'no'
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
}

export type Error =
  Errors.DatasetReviewHasNotBeenStarted | Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewHasBeenPublished

type State = NotStarted | NotAnswered | HasBeenAnswered | IsBeingPublished | HasBeenPublished

class NotStarted extends Data.TaggedClass('NotStarted') {}

class NotAnswered extends Data.TaggedClass('NotAnswered')<{ authorId: OrcidId.OrcidId }> {}

class HasBeenAnswered extends Data.TaggedClass('HasBeenAnswered')<{
  answer: Events.AnsweredIfOthersNeedToBeListedOnTheReview['answer']
  authorId: OrcidId.OrcidId
}> {}

class IsBeingPublished extends Data.TaggedClass('IsBeingPublished')<{ authorId: OrcidId.OrcidId }> {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished')<{ authorId: OrcidId.OrcidId }> {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: [
        'DatasetReviewWasStarted',
        'AnsweredIfOthersNeedToBeListedOnTheReview',
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

      return Option.match(Array.findLast(filteredEvents, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview')), {
        onNone: () => new NotAnswered({ authorId }),
        onSome: ({ answer }) => new HasBeenAnswered({ answer, authorId }),
      })
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
    NotAnswered: () =>
      Either.right(
        Option.some(
          new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
            answer: input.answer,
            datasetReviewId: input.datasetReviewId,
          }),
        ),
      ),
    HasBeenAnswered: ({ answer }) =>
      Boolean.match(Equal.equals(input.answer, answer), {
        onTrue: () => Either.right(Option.none()),
        onFalse: () =>
          Either.right(
            Option.some(
              new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
                answer: input.answer,
                datasetReviewId: input.datasetReviewId,
              }),
            ),
          ),
      }),
  })

export const AnswerIfOthersNeedToBeListedOnTheReview = Commands.Command<[Input], State, Error, true>({
  name: 'DatasetReviews.answerIfOthersNeedToBeListedOnTheReview',
  createFilter,
  foldState,
  authorize,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
