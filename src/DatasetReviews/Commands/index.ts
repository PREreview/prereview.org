import { Context, Data, Effect, Layer } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type { DatasetReviewsEventStore } from '../Context.js'
import type * as Errors from './Errors.js'

export class DatasetReviewCommands extends Context.Tag('DatasetReviewCommands')<
  DatasetReviewCommands,
  {
    startDatasetReview: CommandHandler<
      { readonly authorId: Orcid.Orcid; readonly datasetId: Datasets.DatasetId },
      Errors.DatasetReviewWasAlreadyStarted
    >
  }
>() {}

type CommandHandler<Command, Error> = (
  datasetReviewId: Uuid.Uuid,
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

const makeDatasetReviewCommands: Effect.Effect<typeof DatasetReviewCommands.Service, never, DatasetReviewsEventStore> =
  Effect.sync(() => {
    return {
      startDatasetReview: () => new UnableToHandleCommand({}),
    }
  })

export const layer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
