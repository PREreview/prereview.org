import { Effect, Layer } from 'effect'
import * as Queries from './Queries/index.js'

export * from './Context.js'
export * from './Events.js'
export { DatasetReviewQueries, UnableToQuery } from './Queries/index.js'

export const { findInProgressReviewForADataset } = Effect.serviceFunctions(Queries.DatasetReviewQueries)

export const layer = Layer.mergeAll(Queries.layer)
