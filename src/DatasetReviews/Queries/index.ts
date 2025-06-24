import { Context, Data, Effect, Layer, type Option } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type { DatasetReviewsEventStore } from '../Context.js'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    findInProgressReviewForADataset: Query<
      (authorId: Orcid.Orcid, datasetId: Datasets.DatasetId) => Option.Option<Uuid.Uuid>
    >
  }
>() {}

type Query<F extends (...args: never) => unknown> = (
  ...args: Parameters<F>
) => Effect.Effect<ReturnType<F>, UnableToQuery>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

const makeDatasetReviewQueries: Effect.Effect<typeof DatasetReviewQueries.Service, never, DatasetReviewsEventStore> =
  Effect.sync(() => {
    return {
      findInProgressReviewForADataset: () => new UnableToQuery({}),
    }
  })

export const layer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
