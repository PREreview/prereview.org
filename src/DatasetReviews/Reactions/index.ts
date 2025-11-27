import { Activity, Workflow, type WorkflowEngine } from '@effect/workflow'
import { Effect, Layer, Match, pipe, PubSub, Queue, Schema, Struct, type Scope } from 'effect'
import * as Events from '../../Events.ts'
import { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import { CreateRecordOnZenodo as executeCreateRecordForDatasetReviewOnZenodo } from './CreateRecordOnZenodo.ts'
import { MarkDatasetReviewAsPublished as executeMarkDatasetReviewAsPublished } from './MarkDatasetReviewAsPublished.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfDatasetReview } from './NotifyCommunitySlack.ts'
import { PublishRecordOnZenodo as executePublishDatasetReviewRecordOnZenodo } from './PublishRecordOnZenodo.ts'
import { UseZenodoRecordDoi as executeUseZenodoRecordDoiForDatasetReview } from './UseZenodoRecordDoi.ts'

const CreateRecordForDatasetReviewOnZenodo = Workflow.make({
  name: 'CreateRecordForDatasetReviewOnZenodo',
  error: Errors.FailedToCreateRecordOnZenodo,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

const MarkDatasetReviewAsPublished = Workflow.make({
  name: 'MarkDatasetReviewAsPublished',
  error: Errors.FailedToMarkDatasetReviewAsPublished,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

const NotifyCommunitySlackOfDatasetReview = Workflow.make({
  name: 'NotifyCommunitySlackOfDatasetReview',
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

const PublishDatasetReviewRecordOnZenodo = Workflow.make({
  name: 'PublishDatasetReviewRecordOnZenodo',
  error: Errors.FailedToPublishRecordOnZenodo,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

const UseZenodoRecordDoiForDatasetReview = Workflow.make({
  name: 'UseZenodoRecordDoiForDatasetReview',
  error: Errors.FailedToUseZenodoDoi,
  payload: {
    datasetReviewId: Uuid.UuidSchema,
    recordId: Schema.Number,
  },
  idempotencyKey: Struct.get('datasetReviewId'),
})

const makeDatasetReviewReactions: Effect.Effect<
  never,
  never,
  Events.Events | Scope.Scope | WorkflowEngine.WorkflowEngine
> = Effect.gen(function* () {
  const events = yield* Events.Events
  const dequeue = yield* PubSub.subscribe(events)

  return yield* pipe(
    Queue.take(dequeue),
    Effect.andThen(
      pipe(
        Match.type<Events.Event>(),
        Match.tag('PublicationOfDatasetReviewWasRequested', event =>
          CreateRecordForDatasetReviewOnZenodo.execute(event, { discard: true }),
        ),
        Match.tag('ZenodoRecordForDatasetReviewWasCreated', event =>
          UseZenodoRecordDoiForDatasetReview.execute(event, { discard: true }),
        ),
        Match.tag('DatasetReviewWasAssignedADoi', event =>
          MarkDatasetReviewAsPublished.execute(event, { discard: true }),
        ),
        Match.tag('DatasetReviewWasPublished', event =>
          Effect.all([
            PublishDatasetReviewRecordOnZenodo.execute(event, { discard: true }),
            NotifyCommunitySlackOfDatasetReview.execute(event, { discard: true }),
          ]),
        ),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.forever,
  )
})

const workflowsLayer = Layer.mergeAll(
  CreateRecordForDatasetReviewOnZenodo.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: CreateRecordForDatasetReviewOnZenodo.name,
      error: CreateRecordForDatasetReviewOnZenodo.errorSchema,
      execute: executeCreateRecordForDatasetReviewOnZenodo(datasetReviewId),
    }),
  ),
  MarkDatasetReviewAsPublished.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: MarkDatasetReviewAsPublished.name,
      error: MarkDatasetReviewAsPublished.errorSchema,
      execute: executeMarkDatasetReviewAsPublished(datasetReviewId),
    }),
  ),
  NotifyCommunitySlackOfDatasetReview.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfDatasetReview.name,
      error: NotifyCommunitySlackOfDatasetReview.errorSchema,
      execute: executeNotifyCommunitySlackOfDatasetReview(datasetReviewId),
    }),
  ),
  PublishDatasetReviewRecordOnZenodo.toLayer(({ datasetReviewId }) =>
    Activity.make({
      name: PublishDatasetReviewRecordOnZenodo.name,
      error: PublishDatasetReviewRecordOnZenodo.errorSchema,
      execute: executePublishDatasetReviewRecordOnZenodo(datasetReviewId),
    }),
  ),
  UseZenodoRecordDoiForDatasetReview.toLayer(({ datasetReviewId, recordId }) =>
    Activity.make({
      name: UseZenodoRecordDoiForDatasetReview.name,
      error: UseZenodoRecordDoiForDatasetReview.errorSchema,
      execute: executeUseZenodoRecordDoiForDatasetReview(datasetReviewId, recordId),
    }),
  ),
)

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('DatasetReviews worker started'), Effect.andThen(makeDatasetReviewReactions)),
    () => Effect.logDebug('DatasetReviews worker stopped'),
  ),
).pipe(Layer.provide(workflowsLayer))
