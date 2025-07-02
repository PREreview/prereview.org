import { Array, Context, Data, Effect, type Either, Layer, pipe } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Events from '../Events.js'
import * as AnswerIfTheDatasetFollowsFairAndCarePrinciples from './AnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import type * as Errors from './Errors.js'
import * as StartDatasetReview from './StartDatasetReview.js'

export * from './Errors.js'

export class DatasetReviewCommands extends Context.Tag('DatasetReviewCommands')<
  DatasetReviewCommands,
  {
    startDatasetReview: CommandHandler<StartDatasetReview.StartDatasetReview, Errors.DatasetReviewWasAlreadyStarted>
    answerIfTheDatasetFollowsFairAndCarePrinciples: CommandHandler<
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Command,
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Error
    >
  }
>() {}

type CommandHandler<Command, Error> = (
  datasetReviewId: Uuid.Uuid,
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const { startDatasetReview, answerIfTheDatasetFollowsFairAndCarePrinciples } =
  Effect.serviceFunctions(DatasetReviewCommands)

const makeDatasetReviewCommands: Effect.Effect<
  typeof DatasetReviewCommands.Service,
  never,
  Events.DatasetReviewsEventStore
> = Effect.gen(function* () {
  const eventStore = yield* Events.DatasetReviewsEventStore

  const handleCommand = <State, Command, Error>(
    foldState: (events: ReadonlyArray<Events.DatasetReviewEvent>) => State,
    decide: (command: Command) => (state: State) => Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Error>,
  ): CommandHandler<Command, Error> =>
    Effect.fn(
      function* (datasetReviewId, command) {
        const { events, latestVersion } = yield* eventStore.getEvents(datasetReviewId)

        yield* pipe(
          foldState(events),
          decide(command),
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
    )

  return {
    startDatasetReview: handleCommand(StartDatasetReview.foldState, StartDatasetReview.decide),
    answerIfTheDatasetFollowsFairAndCarePrinciples: handleCommand(
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.foldState,
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.decide,
    ),
  }
})

export const commandsLayer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
