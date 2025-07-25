import { Context, Data, Effect, type Either, Layer } from 'effect'
import { EventStore } from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import { DatasetReviewEventTypes } from '../Events.js'
import { CheckIfReviewIsInProgress } from './CheckIfReviewIsInProgress.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'
import { GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples } from './GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples.js'
import { GetAuthor } from './GetAuthor.js'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    checkIfReviewIsInProgress: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof CheckIfReviewIsInProgress>,
      Errors.UnknownDatasetReview
    >
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
    getAuthor: Query<(datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAuthor>, Errors.UnknownDatasetReview>
    getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples>,
      Errors.UnknownDatasetReview
    >
  }
>() {}

type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Either.Either<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | E | Exclude<L, { _tag: 'UnexpectedSequenceOfEvents' }>>
  : Effect.Effect<ReturnType<F>, UnableToQuery | E>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const {
  checkIfReviewIsInProgress,
  findInProgressReviewForADataset,
  getAuthor,
  getAnswerToIfTheDatasetFollowsFairAndCarePrinciples,
} = Effect.serviceFunctions(DatasetReviewQueries)

const makeDatasetReviewQueries: Effect.Effect<typeof DatasetReviewQueries.Service, never, EventStore> = Effect.gen(
  function* () {
    const eventStore = yield* EventStore

    return {
      checkIfReviewIsInProgress: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* eventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* CheckIfReviewIsInProgress(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
      ),
      findInProgressReviewForADataset: Effect.fn(
        function* (...args) {
          const { events } = yield* eventStore.query({
            types: ['DatasetReviewWasStarted', 'PublicationOfDatasetReviewWasRequested', 'DatasetReviewWasPublished'],
          })

          return FindInProgressReviewForADataset(events)(...args)
        },
        Effect.catchTag('NoEventsFound', () => Effect.succeedNone),
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      ),
      getAuthor: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* eventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetAuthor(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
      ),
      getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* eventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      ),
    }
  },
)

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
