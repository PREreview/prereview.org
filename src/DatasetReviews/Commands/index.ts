import { Context, Data, Effect, type Either, Layer, Option, pipe } from 'effect'
import * as Events from '../../Events.js'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'
import * as AnswerIfTheDatasetFollowsFairAndCarePrinciples from './AnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as MarkDatasetReviewAsPublished from './MarkDatasetReviewAsPublished.js'
import * as MarkDoiAsActivated from './MarkDoiAsActivated.js'
import * as MarkDoiAsAssigned from './MarkDoiAsAssigned.js'
import * as MarkRecordAsPublishedOnZenodo from './MarkRecordAsPublishedOnZenodo.js'
import * as MarkRecordCreatedOnZenodo from './MarkRecordCreatedOnZenodo.js'
import * as PublishDatasetReview from './PublishDatasetReview.js'
import * as StartDatasetReview from './StartDatasetReview.js'

export class DatasetReviewCommands extends Context.Tag('DatasetReviewCommands')<
  DatasetReviewCommands,
  {
    startDatasetReview: CommandHandler<StartDatasetReview.StartDatasetReview, Errors.DatasetReviewWasAlreadyStarted>
    answerIfTheDatasetFollowsFairAndCarePrinciples: CommandHandler<
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Command,
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Error
    >
    markRecordCreatedOnZenodo: CommandHandler<MarkRecordCreatedOnZenodo.Command, MarkRecordCreatedOnZenodo.Error>
    markRecordAsPublishedOnZenodo: CommandHandler<
      MarkRecordAsPublishedOnZenodo.Command,
      MarkRecordAsPublishedOnZenodo.Error
    >
    markDoiAsAssigned: CommandHandler<MarkDoiAsAssigned.Command, MarkDoiAsAssigned.Error>
    markDoiAsActivated: CommandHandler<MarkDoiAsActivated.Command, MarkDoiAsActivated.Error>
    publishDatasetReview: CommandHandler<PublishDatasetReview.Command, PublishDatasetReview.Error>
    markDatasetReviewAsPublished: CommandHandler<
      MarkDatasetReviewAsPublished.Command,
      MarkDatasetReviewAsPublished.Error
    >
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
  markRecordAsPublishedOnZenodo,
  markDoiAsAssigned,
  markDoiAsActivated,
  publishDatasetReview,
  markDatasetReviewAsPublished,
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
          const filter = Events.EventFilter({
            types: Events.DatasetReviewEventTypes,
            predicates: { datasetReviewId: command.datasetReviewId },
          })

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
      markRecordAsPublishedOnZenodo: handleCommand(
        MarkRecordAsPublishedOnZenodo.foldState,
        MarkRecordAsPublishedOnZenodo.decide,
      ),
      markDoiAsAssigned: handleCommand(MarkDoiAsAssigned.foldState, MarkDoiAsAssigned.decide),
      markDoiAsActivated: handleCommand(MarkDoiAsActivated.foldState, MarkDoiAsActivated.decide),
      publishDatasetReview: handleCommand(PublishDatasetReview.foldState, PublishDatasetReview.decide),
      markDatasetReviewAsPublished: handleCommand(
        MarkDatasetReviewAsPublished.foldState,
        MarkDatasetReviewAsPublished.decide,
      ),
    }
  })

export const commandsLayer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
