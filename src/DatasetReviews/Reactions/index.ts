import { Effect, Layer, Match, pipe, PubSub, Queue, type Scope } from 'effect'
import * as Events from '../../Events.js'
import type * as Personas from '../../Personas/index.js'
import type { Zenodo } from '../../Zenodo/index.js'
import type { DatasetReviewCommands } from '../Commands/index.js'
import type { DatasetReviewQueries } from '../Queries/index.js'
import { CreateRecordOnZenodo } from './CreateRecordOnZenodo.js'
import { MarkDatasetReviewAsPublished } from './MarkDatasetReviewAsPublished.js'
import { PublishRecordOnZenodo } from './PublishRecordOnZenodo.js'
import { UseZenodoRecordDoi } from './UseZenodoRecordDoi.js'

const makeDatasetReviewReactions: Effect.Effect<
  never,
  never,
  DatasetReviewCommands | DatasetReviewQueries | Events.Events | Personas.Personas | Scope.Scope | Zenodo
> = Effect.gen(function* () {
  const events = yield* Events.Events
  const dequeue = yield* PubSub.subscribe(events)

  return yield* pipe(
    Queue.take(dequeue),
    Effect.andThen(
      pipe(
        Match.type<Events.Event>(),
        Match.tag('PublicationOfDatasetReviewWasRequested', event => CreateRecordOnZenodo(event.datasetReviewId)),
        Match.tag('ZenodoRecordForDatasetReviewWasCreated', event =>
          UseZenodoRecordDoi(event.datasetReviewId, event.recordId),
        ),
        Match.tag('DatasetReviewWasAssignedADoi', event => MarkDatasetReviewAsPublished(event.datasetReviewId)),
        Match.tag('DatasetReviewWasPublished', event => PublishRecordOnZenodo(event.datasetReviewId)),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.catchAll(error => Effect.annotateLogs(Effect.logError('DatasetReviewReactions failed'), { error })),
    Effect.scoped,
    Effect.forever,
  )
})

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('DatasetReviews worker started'), Effect.andThen(makeDatasetReviewReactions)),
    () => Effect.logDebug('DatasetReviews worker stopped'),
  ),
)
