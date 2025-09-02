import { Array, Context, Data, Effect, type Either, Layer, pipe } from 'effect'
import type * as Events from '../../Events.js'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import { DatasetReviewEventTypes } from '../Events.js'
import { CheckIfReviewIsBeingPublished } from './CheckIfReviewIsBeingPublished.js'
import { CheckIfReviewIsInProgress } from './CheckIfReviewIsInProgress.js'
import * as CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples from './CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted from './CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.js'
import * as CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata from './CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.js'
import * as CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges from './CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.js'
import * as CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch from './CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.js'
import * as CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions from './CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.js'
import * as CheckIfUserCanRateTheQuality from './CheckIfUserCanRateTheQuality.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'
import { FindPublishedReviewsForADataset } from './FindPublishedReviewsForADataset.js'
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
    checkIfUserCanRateTheQuality: Query<
      (input: CheckIfUserCanRateTheQuality.Input) => CheckIfUserCanRateTheQuality.Result
    >
    checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.Result
    >
    checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.Result
    >
    checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.Result
    >
    checkIfUserCanAnswerIfTheDatasetHasTrackedChanges: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.Result
    >
    checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.Result
    >
    checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.Result
    >
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
    findPublishedReviewsForADataset: Query<ReturnType<typeof FindPublishedReviewsForADataset>>
    getAuthor: Query<(datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAuthor>, Errors.UnknownDatasetReview>
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
  checkIfUserCanRateTheQuality,
  checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples,
  checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted,
  checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata,
  checkIfUserCanAnswerIfTheDatasetHasTrackedChanges,
  checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch,
  checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions,
  getPublishedDoi,
  getPublishedReview,
  findInProgressReviewForADataset,
  findPublishedReviewsForADataset,
  getAuthor,
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

    const handleQuery = <Event extends Events.DatasetReviewEvent['_tag'], Input, Result, Error>(
      createFilter: (input: Input) => Events.EventFilter<Event>,
      query: (
        events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>,
        input: Input,
      ) => Either.Either<Result, Error>,
    ): ((input: Input) => Effect.Effect<Result, UnableToQuery | Error>) =>
      Effect.fn(
        function* (input) {
          const filter = createFilter(input)

          const { events } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
          )

          return yield* query(events, input)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      )

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
      checkIfUserCanRateTheQuality: handleQuery(
        CheckIfUserCanRateTheQuality.createFilter,
        CheckIfUserCanRateTheQuality.query,
      ),
      checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples: handleQuery(
        CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.createFilter,
        CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.query,
      ),
      checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted: handleQuery(
        CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.createFilter,
        CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.query,
      ),
      checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata: handleQuery(
        CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.createFilter,
        CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.query,
      ),
      checkIfUserCanAnswerIfTheDatasetHasTrackedChanges: handleQuery(
        CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.createFilter,
        CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.query,
      ),
      checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch: handleQuery(
        CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.createFilter,
        CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.query,
      ),
      checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: handleQuery(
        CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.createFilter,
        CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.query,
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
