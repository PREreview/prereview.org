import { Effect, Layer, Match, pipe, PubSub, Queue, type Scope } from 'effect'
import * as Events from '../../Events.ts'
import type * as Personas from '../../Personas/index.ts'
import type { PublicUrl } from '../../public-url.ts'
import type { Zenodo } from '../../Zenodo/index.ts'
import type { DatasetReviewCommands } from '../Commands/index.ts'
import type { DatasetReviewQueries } from '../Queries/index.ts'
import { CreateRecordOnZenodo } from './CreateRecordOnZenodo.ts'
import { MarkDatasetReviewAsPublished } from './MarkDatasetReviewAsPublished.ts'
import { PublishRecordOnZenodo } from './PublishRecordOnZenodo.ts'
import { UseZenodoRecordDoi } from './UseZenodoRecordDoi.ts'

const makeDatasetReviewReactions: Effect.Effect<
  never,
  never,
  DatasetReviewCommands | DatasetReviewQueries | Events.Events | Personas.Personas | PublicUrl | Scope.Scope | Zenodo
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
