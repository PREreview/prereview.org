import { Array, Context, Data, Effect, Layer, type Option } from 'effect'
import type { Orcid, Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import { type AnsweredIfTheDatasetFollowsFairAndCarePrinciples, DatasetReviewsEventStore } from '../Events.js'
import { CheckIfReviewIsInProgress } from './CheckIfReviewIsInProgress.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'
import { GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples } from './GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples.js'
import { GetAuthor } from './GetAuthor.js'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    checkIfReviewIsInProgress: Query<
      (datasetReviewId: Uuid.Uuid) => void,
      Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewHasBeenPublished | Errors.UnknownDatasetReview
    >
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
    getAuthor: Query<(datasetReviewId: Uuid.Uuid) => Orcid.Orcid, Errors.UnknownDatasetReview>
    getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: Query<
      (datasetReviewId: Uuid.Uuid) => Option.Option<AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']>,
      Errors.UnknownDatasetReview
    >
  }
>() {}

type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => Effect.Effect<ReturnType<F>, UnableToQuery | E>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const {
  checkIfReviewIsInProgress,
  findInProgressReviewForADataset,
  getAuthor,
  getAnswerToIfTheDatasetFollowsFairAndCarePrinciples,
} = Effect.serviceFunctions(DatasetReviewQueries)

const makeDatasetReviewQueries: Effect.Effect<typeof DatasetReviewQueries.Service, never, DatasetReviewsEventStore> =
  Effect.gen(function* () {
    const eventStore = yield* DatasetReviewsEventStore

    return {
      checkIfReviewIsInProgress: Effect.fn(
        function* (...args) {
          const { events } = yield* eventStore.getEvents(...args)

          if (Array.isEmptyReadonlyArray(events)) {
            return yield* new Errors.UnknownDatasetReview({ cause: 'No events found' })
          }

          return yield* CheckIfReviewIsInProgress(events)
        },
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
      ),
      findInProgressReviewForADataset: Effect.fn(
        function* (...args) {
          const events = yield* eventStore.getAllEventsOfType(
            'DatasetReviewWasStarted',
            'PublicationOfDatasetReviewWasRequested',
            'DatasetReviewWasPublished',
          )

          return FindInProgressReviewForADataset(events)(...args)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      ),
      getAuthor: Effect.fn(
        function* (...args) {
          const { events } = yield* eventStore.getEvents(...args)

          if (Array.isEmptyReadonlyArray(events)) {
            return yield* new Errors.UnknownDatasetReview({ cause: 'No events found' })
          }

          return yield* GetAuthor(events)
        },
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
      ),
      getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: Effect.fn(
        function* (...args) {
          const { events } = yield* eventStore.getEvents(...args)

          if (Array.isEmptyReadonlyArray(events)) {
            return yield* new Errors.UnknownDatasetReview({ cause: 'No events found' })
          }

          return GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples(events)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      ),
    }
  })

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
