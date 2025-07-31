import { Context, Data, Effect, type Either, Layer, Option, pipe } from 'effect'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'
import * as Events from '../Events.js'
import * as AnswerIfTheDatasetFollowsFairAndCarePrinciples from './AnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as MarkDoiAsAssigned from './MarkDoiAsAssigned.js'
import * as MarkRecordCreatedOnZenodo from './MarkRecordCreatedOnZenodo.js'
import * as PublishDatasetReview from './PublishDatasetReview.js'
import * as StartDatasetReview from './StartDatasetReview.js'

type NewType = MarkDoiAsAssigned.Command

export class DatasetReviewCommands extends Context.Tag('DatasetReviewCommands')<
  DatasetReviewCommands,
  {
    startDatasetReview: CommandHandler<StartDatasetReview.StartDatasetReview, Errors.DatasetReviewWasAlreadyStarted>
    answerIfTheDatasetFollowsFairAndCarePrinciples: CommandHandler<
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Command,
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Error
    >
    markRecordCreatedOnZenodo: CommandHandler<MarkRecordCreatedOnZenodo.Command, MarkRecordCreatedOnZenodo.Error>
    markDoiAsAssigned: CommandHandler<NewType, MarkDoiAsAssigned.Error>
    publishDatasetReview: CommandHandler<PublishDatasetReview.Command, PublishDatasetReview.Error>
  }
>() {}

type CommandHandler<Command extends { datasetReviewId: Uuid.Uuid }, Error> = (
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const {
  startDatasetReview,
  answerIfTheDatasetFollowsFairAndCarePrinciples,
  markRecordCreatedOnZenodo,
  markDoiAsAssigned,
  publishDatasetReview,
} = Effect.serviceFunctions(DatasetReviewCommands)

const makeDatasetReviewCommands: Effect.Effect<typeof DatasetReviewCommands.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.context<EventStore.EventStore>()

    const handleCommand = <State, Command extends { datasetReviewId: Uuid.Uuid }, Error>(
      foldState: (events: ReadonlyArray<Events.DatasetReviewEvent>) => State,
      decide: (command: Command) => (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>,
    ): CommandHandler<Command, Error> =>
      Effect.fn(
        function* (command) {
          const filter = {
            types: Events.DatasetReviewEventTypes,
            predicates: { datasetReviewId: command.datasetReviewId },
          } satisfies EventStore.EventFilter<Events.DatasetReviewEvent['_tag']>

          const { events, lastKnownEvent } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: [], lastKnownEvent: undefined })),
          )

          yield* pipe(
            foldState(events),
            decide(command),
            Effect.tap(
              Option.match({
                onNone: () => Effect.void,
                onSome: event =>
                  EventStore.append(event, { filter, lastKnownEvent: Option.fromNullable(lastKnownEvent) }),
              }),
            ),
          )
        },
        Effect.catchTag(
          'FailedToCommitEvent',
          'FailedToGetEvents',
          'NewEventsFound',
          cause => new UnableToHandleCommand({ cause }),
        ),
        Effect.provide(context),
      )

    return {
      startDatasetReview: handleCommand(StartDatasetReview.foldState, StartDatasetReview.decide),
      answerIfTheDatasetFollowsFairAndCarePrinciples: handleCommand(
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.foldState,
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.decide,
      ),
      markRecordCreatedOnZenodo: handleCommand(MarkRecordCreatedOnZenodo.foldState, MarkRecordCreatedOnZenodo.decide),
      markDoiAsAssigned: handleCommand(MarkDoiAsAssigned.foldState, MarkDoiAsAssigned.decide),
      publishDatasetReview: handleCommand(PublishDatasetReview.foldState, PublishDatasetReview.decide),
    }
  })

export const commandsLayer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
