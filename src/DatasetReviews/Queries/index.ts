import { Context, Data, Effect, Layer } from 'effect'
import type { Orcid, Uuid } from '../../types/index.js'
import { DatasetReviewsEventStore } from '../Events.js'
import type * as Errors from './Errors.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'

export * from './Errors.js'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    findInProgressReviewForADataset: Query<ReturnType<typeof FindInProgressReviewForADataset>>
    getAuthor: (datasetReviewId: Uuid.Uuid) => Effect.Effect<Orcid.Orcid, Errors.UnknownDatasetReview | UnableToQuery>
  }
>() {}

type Query<F extends (...args: never) => unknown> = (
  ...args: Parameters<F>
) => Effect.Effect<ReturnType<F>, UnableToQuery>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const { findInProgressReviewForADataset } = Effect.serviceFunctions(DatasetReviewQueries)

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
      getAuthor: () => new UnableToQuery({}),
    }
  })

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
