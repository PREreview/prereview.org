import { Context, Data, Effect, type Either, Layer, Option, pipe } from 'effect'
import type * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'
import * as Events from '../Events.js'
import * as AnswerIfTheDatasetFollowsFairAndCarePrinciples from './AnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as StartDatasetReview from './StartDatasetReview.js'

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

type CommandHandler<Command extends { datasetReviewId: Uuid.Uuid }, Error> = (
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

  const handleCommand = <State, Command extends { datasetReviewId: Uuid.Uuid }, Error>(
    foldState: (events: ReadonlyArray<Events.DatasetReviewEvent>) => State,
    decide: (command: Command) => (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>,
  ): CommandHandler<Command, Error> =>
    Effect.fn(
      function* (command) {
        const filter = {
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        } satisfies EventStore.EventFilter<Events.DatasetReviewEvent, Events.DatasetReviewEvent['_tag']>

        const { events, lastKnownEvent } = yield* pipe(
          eventStore.query(filter),
          Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: [], lastKnownEvent: undefined })),
        )

        yield* pipe(
          foldState(events),
          decide(command),
          Effect.tap(
            Option.match({
              onNone: () => Effect.void,
              onSome: event =>
                eventStore.append(event, { filter, lastKnownEvent: Option.fromNullable(lastKnownEvent) }),
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
