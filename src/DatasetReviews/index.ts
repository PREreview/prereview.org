import { Effect, Layer } from 'effect'
import * as Commands from './Commands/index.js'
import * as Queries from './Queries/index.js'

export { DatasetReviewCommands, UnableToHandleCommand } from './Commands/index.js'
export * from './Events.js'
export { DatasetReviewQueries, UnableToQuery } from './Queries/index.js'

export const { startDatasetReview } = Effect.serviceFunctions(Commands.DatasetReviewCommands)

export const { findInProgressReviewForADataset } = Effect.serviceFunctions(Queries.DatasetReviewQueries)

export const layer = Layer.mergeAll(Commands.layer, Queries.layer)
