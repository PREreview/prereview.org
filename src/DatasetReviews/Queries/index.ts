import { Context, Data, Effect, type Either, Layer } from 'effect'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import { DatasetReviewEventTypes } from '../Events.js'
import { CheckIfReviewIsBeingPublished } from './CheckIfReviewIsBeingPublished.js'
import { CheckIfReviewIsInProgress } from './CheckIfReviewIsInProgress.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'
import { GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples } from './GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples.js'
import { GetAuthor } from './GetAuthor.js'
import { GetDataForZenodoRecord } from './GetDataForZenodoRecord.js'
import { GetPreviewForAReviewReadyToBePublished } from './GetPreviewForAReviewReadyToBePublished.js'
import type { GetPublishedDoi } from './GetPublishedDoi.js'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    checkIfReviewIsInProgress: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof CheckIfReviewIsInProgress>,
      Errors.UnknownDatasetReview
    >
    checkIfReviewIsBeingPublished: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof CheckIfReviewIsBeingPublished>,
      Errors.UnknownDatasetReview
    >
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
    getAuthor: Query<(datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAuthor>, Errors.UnknownDatasetReview>
    getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples>,
      Errors.UnknownDatasetReview
    >
    getPreviewForAReviewReadyToBePublished: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetPreviewForAReviewReadyToBePublished>,
      Errors.UnknownDatasetReview
    >
    getPublishedDoi: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetPublishedDoi>,
      Errors.UnknownDatasetReview
    >
    getDataForZenodoRecord: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetDataForZenodoRecord>,
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
  checkIfReviewIsBeingPublished,
  getPublishedDoi,
  findInProgressReviewForADataset,
  getAuthor,
  getAnswerToIfTheDatasetFollowsFairAndCarePrinciples,
  getPreviewForAReviewReadyToBePublished,
  getDataForZenodoRecord,
} = Effect.serviceFunctions(DatasetReviewQueries)

export type { DatasetReviewPreview } from './GetPreviewForAReviewReadyToBePublished.js'

const makeDatasetReviewQueries: Effect.Effect<typeof DatasetReviewQueries.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.context<EventStore.EventStore>()

    return {
      checkIfReviewIsInProgress: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* CheckIfReviewIsInProgress(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      checkIfReviewIsBeingPublished: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* CheckIfReviewIsBeingPublished(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      findInProgressReviewForADataset: Effect.fn(
        function* (...args) {
          const { events } = yield* EventStore.query({
            types: ['DatasetReviewWasStarted', 'PublicationOfDatasetReviewWasRequested', 'DatasetReviewWasPublished'],
          })

          return FindInProgressReviewForADataset(events)(...args)
        },
        Effect.catchTag('NoEventsFound', () => Effect.succeedNone),
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getAuthor: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetAuthor(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getAnswerToIfTheDatasetFollowsFairAndCarePrinciples: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getPreviewForAReviewReadyToBePublished: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetPreviewForAReviewReadyToBePublished(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getPublishedDoi: () => new UnableToQuery({ cause: 'not implemented' }),
      getDataForZenodoRecord: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetDataForZenodoRecord(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
    }
  })

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
