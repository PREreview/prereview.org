import type { WorkflowEngine } from '@effect/workflow'
import { Effect, Layer, Match, pipe, PubSub, Queue, type Scope } from 'effect'
import * as Events from '../Events.ts'
import * as Workflows from './Workflows/index.ts'

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
          Workflows.CreateRecordForDatasetReviewOnZenodo.execute(event, { discard: true }),
        ),
        Match.tag('ZenodoRecordForDatasetReviewWasCreated', event =>
          Workflows.UseZenodoRecordDoiForDatasetReview.execute(event, { discard: true }),
        ),
        Match.tag('DatasetReviewWasAssignedADoi', event =>
          Workflows.MarkDatasetReviewAsPublished.execute(event, { discard: true }),
        ),
        Match.tag('DatasetReviewWasPublished', event =>
          Effect.all([
            Workflows.PublishDatasetReviewRecordOnZenodo.execute(event, { discard: true }),
            Workflows.NotifyCommunitySlackOfDatasetReview.execute(event, { discard: true }),
          ]),
        ),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.forever,
  )
})

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('DatasetReviews worker started'), Effect.andThen(makeDatasetReviewReactions)),
    () => Effect.logDebug('DatasetReviews worker stopped'),
  ),
)
