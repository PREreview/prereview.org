import { Array, Either, Equal, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { NonEmptyString, OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  authorId: OrcidId.OrcidId
}

export type UseOfAi =
  | { _tag: 'AiWasUsed'; generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString> }
  | { _tag: 'AiWasNotUsed' }
  | { _tag: 'NotAnswered' }

export type Result = Either.Either<
  UseOfAi,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
>

const createFilter = ({ datasetReviewId }: Input) =>
  Events.EventFilter({
    types: [
      'DatasetReviewWasStarted',
      'DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview',
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

    return Option.match(
      Array.findLast(filteredEvents, hasTag('DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview')),
      {
        onNone: (): UseOfAi => ({ _tag: 'NotAnswered' }),
        onSome: ({ generativeAiIdeas }): UseOfAi =>
          generativeAiIdeas.answer === 'yes'
            ? { _tag: 'AiWasUsed', generativeAiIdeasDetails: generativeAiIdeas.detail }
            : { _tag: 'AiWasNotUsed' },
      },
    )
  })

export const CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas = Queries.OnDemandQuery({
  name: 'DatasetReviewQueries.checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
