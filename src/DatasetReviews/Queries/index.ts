import { Context, Data, Effect, Layer } from 'effect'
import { DatasetReviewsEventStore } from '../Events.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
  }
>() {}

type Query<F extends (...args: never) => unknown> = (
  ...args: Parameters<F>
) => Effect.Effect<ReturnType<F>, UnableToQuery>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

const makeDatasetReviewQueries: Effect.Effect<typeof DatasetReviewQueries.Service, never, DatasetReviewsEventStore> =
  Effect.gen(function* () {
    const eventStore = yield* DatasetReviewsEventStore

    return {
      findInProgressReviewForADataset: Effect.fn(
        function* (...args) {
          const events = yield* eventStore.getAllEventsOfType(
            'DatasetReviewWasStarted',
            'PublicationWasRequested',
            'DatasetReviewWasPublished',
          )

          return FindInProgressReviewForADataset(events)(...args)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      ),
    }
  })

export const layer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
