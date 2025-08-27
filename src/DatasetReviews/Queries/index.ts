import { Array, Context, Data, Effect, type Either, Layer, pipe } from 'effect'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import { DatasetReviewEventTypes } from '../Events.js'
import { CheckIfReviewIsBeingPublished } from './CheckIfReviewIsBeingPublished.js'
import { CheckIfReviewIsInProgress } from './CheckIfReviewIsInProgress.js'
import * as CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples from './CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'
import { FindPublishedReviewsForADataset } from './FindPublishedReviewsForADataset.js'
import { GetAnswerToIfTheDatasetHasEnoughMetadata } from './GetAnswerToIfTheDatasetHasEnoughMetadata.js'
import { GetAnswerToIfTheDatasetHasTrackedChanges } from './GetAnswerToIfTheDatasetHasTrackedChanges.js'
import { GetAuthor } from './GetAuthor.js'
import { GetDataForZenodoRecord } from './GetDataForZenodoRecord.js'
import { GetNextExpectedCommandForAUserOnADatasetReview } from './GetNextExpectedCommandForAUserOnADatasetReview.js'
import { GetPreviewForAReviewReadyToBePublished } from './GetPreviewForAReviewReadyToBePublished.js'
import { GetPublishedDoi } from './GetPublishedDoi.js'
import { GetPublishedReview } from './GetPublishedReview.js'
import { GetZenodoRecordId } from './GetZenodoRecordId.js'

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
    checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.Result
    >
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
    findPublishedReviewsForADataset: Query<ReturnType<typeof FindPublishedReviewsForADataset>>
    getAuthor: Query<(datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAuthor>, Errors.UnknownDatasetReview>
    getAnswerToIfTheDatasetHasEnoughMetadata: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAnswerToIfTheDatasetHasEnoughMetadata>,
      Errors.UnknownDatasetReview
    >
    getAnswerToIfTheDatasetHasTrackedChanges: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAnswerToIfTheDatasetHasTrackedChanges>,
      Errors.UnknownDatasetReview
    >
    getNextExpectedCommandForAUserOnADatasetReview: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetNextExpectedCommandForAUserOnADatasetReview>,
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
    getPublishedReview: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetPublishedReview>,
      Errors.UnknownDatasetReview
    >
    getDataForZenodoRecord: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetDataForZenodoRecord>,
      Errors.UnknownDatasetReview
    >
    getZenodoRecordId: Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetZenodoRecordId>,
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
  checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples,
  getPublishedDoi,
  getPublishedReview,
  findInProgressReviewForADataset,
  findPublishedReviewsForADataset,
  getAuthor,
  getAnswerToIfTheDatasetHasEnoughMetadata,
  getAnswerToIfTheDatasetHasTrackedChanges,
  getNextExpectedCommandForAUserOnADatasetReview,
  getPreviewForAReviewReadyToBePublished,
  getDataForZenodoRecord,
  getZenodoRecordId,
} = Effect.serviceFunctions(DatasetReviewQueries)

export type { DatasetReviewPreview } from './GetPreviewForAReviewReadyToBePublished.js'

export type { PublishedReview } from './GetPublishedReview.js'

export type { NextExpectedCommand } from './GetNextExpectedCommandForAUserOnADatasetReview.js'

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
      checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples: Effect.fn(
        function* (input) {
          const filter = CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.createFilter(input)

          const { events } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
          )

          return yield* CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.query(events, input)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
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
      findPublishedReviewsForADataset: Effect.fn(
        function* (...args) {
          const { events } = yield* EventStore.query({
            types: ['DatasetReviewWasStarted', 'DatasetReviewWasPublished'],
          })

          return FindPublishedReviewsForADataset(events)(...args)
        },
        Effect.catchTag('NoEventsFound', () => Effect.sync(Array.empty)),
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
      getAnswerToIfTheDatasetHasEnoughMetadata: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return GetAnswerToIfTheDatasetHasEnoughMetadata(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getAnswerToIfTheDatasetHasTrackedChanges: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return GetAnswerToIfTheDatasetHasTrackedChanges(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getNextExpectedCommandForAUserOnADatasetReview: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return GetNextExpectedCommandForAUserOnADatasetReview(events)
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
      getPublishedDoi: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetPublishedDoi(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
      getPublishedReview: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetPublishedReview(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
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
      getZenodoRecordId: Effect.fn(
        function* (datasetReviewId) {
          const { events } = yield* EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          })

          return yield* GetZenodoRecordId(events)
        },
        Effect.catchTag('NoEventsFound', cause => new Errors.UnknownDatasetReview({ cause })),
        Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      ),
    }
  })

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
