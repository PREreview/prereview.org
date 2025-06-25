import { Array, Context, Data, Effect, Layer, pipe } from 'effect'
import type { Uuid } from '../../types/index.js'
import { DatasetReviewsEventStore } from '../Context.js'
import type * as Errors from './Errors.js'
import * as StartDatasetReview from './StartDatasetReview.js'

export class DatasetReviewCommands extends Context.Tag('DatasetReviewCommands')<
  DatasetReviewCommands,
  {
    startDatasetReview: CommandHandler<StartDatasetReview.StartDatasetReview, Errors.DatasetReviewWasAlreadyStarted>
  }
>() {}

type CommandHandler<Command, Error> = (
  datasetReviewId: Uuid.Uuid,
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

const makeDatasetReviewCommands: Effect.Effect<typeof DatasetReviewCommands.Service, never, DatasetReviewsEventStore> =
  Effect.gen(function* () {
    const eventStore = yield* DatasetReviewsEventStore

    return {
      startDatasetReview: Effect.fn(
        function* (datasetReviewId, command) {
          const { events, latestVersion } = yield* eventStore.getEvents(datasetReviewId)

          yield* pipe(
            StartDatasetReview.foldState(events),
            StartDatasetReview.decide(command),
            Effect.tap(
              Array.match({
                onEmpty: () => Effect.void,
                onNonEmpty: events => eventStore.commitEvents(datasetReviewId, latestVersion)(...events),
              }),
            ),
          )
        },
        Effect.catchTag(
          'FailedToCommitEvent',
          'FailedToGetEvents',
          'ResourceHasChanged',
          cause => new UnableToHandleCommand({ cause }),
        ),
      ),
    }
  })

export const layer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
