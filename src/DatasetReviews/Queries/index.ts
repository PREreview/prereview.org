import { Array, Context, Data, Effect, Layer } from 'effect'
import type { Orcid, Uuid } from '../../types/index.js'
import { DatasetReviewsEventStore } from '../Events.js'
import * as Errors from './Errors.js'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.js'
import { GetAuthor } from './GetAuthor.js'

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

export const { findInProgressReviewForADataset, getAuthor } = Effect.serviceFunctions(DatasetReviewQueries)

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
    }
  })

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
