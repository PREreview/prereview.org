import { Context, Data, Effect, type Either, Layer, Option, pipe } from 'effect'
import * as Events from '../../Events.js'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'
import * as AnswerIfTheDatasetFollowsFairAndCarePrinciples from './AnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as AnswerIfTheDatasetHasEnoughMetadata from './AnswerIfTheDatasetHasEnoughMetadata.js'
import * as AnswerIfTheDatasetHasTrackedChanges from './AnswerIfTheDatasetHasTrackedChanges.js'
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
    answerIfTheDatasetHasEnoughMetadata: CommandHandler<
      AnswerIfTheDatasetHasEnoughMetadata.Command,
      AnswerIfTheDatasetHasEnoughMetadata.Error
    >
    answerIfTheDatasetHasTrackedChanges: CommandHandler<
      AnswerIfTheDatasetHasTrackedChanges.Command,
      AnswerIfTheDatasetHasTrackedChanges.Error
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
  answerIfTheDatasetHasEnoughMetadata,
  answerIfTheDatasetHasTrackedChanges,
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

    const handleCommand = <
      Event extends Events.DatasetReviewEvent['_tag'],
      State,
      Command extends { datasetReviewId: Uuid.Uuid },
      Error,
    >(
      createFilter: (command: Command) => Events.EventFilter<Event>,
      foldState: (events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>) => State,
      decide: (command: Command) => (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>,
    ): CommandHandler<Command, Error> =>
      Effect.fn(
        function* (command) {
          const filter = createFilter(command)

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
      startDatasetReview: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        StartDatasetReview.foldState,
        StartDatasetReview.decide,
      ),
      answerIfTheDatasetFollowsFairAndCarePrinciples: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.foldState,
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.decide,
      ),
      answerIfTheDatasetHasEnoughMetadata: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        AnswerIfTheDatasetHasEnoughMetadata.foldState,
        AnswerIfTheDatasetHasEnoughMetadata.decide,
      ),
      answerIfTheDatasetHasTrackedChanges: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        AnswerIfTheDatasetHasTrackedChanges.foldState,
        AnswerIfTheDatasetHasTrackedChanges.decide,
      ),
      markRecordCreatedOnZenodo: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        MarkRecordCreatedOnZenodo.foldState,
        MarkRecordCreatedOnZenodo.decide,
      ),
      markRecordAsPublishedOnZenodo: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        MarkRecordAsPublishedOnZenodo.foldState,
        MarkRecordAsPublishedOnZenodo.decide,
      ),
      markDoiAsAssigned: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        MarkDoiAsAssigned.foldState,
        MarkDoiAsAssigned.decide,
      ),
      markDoiAsActivated: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        MarkDoiAsActivated.foldState,
        MarkDoiAsActivated.decide,
      ),
      publishDatasetReview: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        PublishDatasetReview.foldState,
        PublishDatasetReview.decide,
      ),
      markDatasetReviewAsPublished: handleCommand(
        command => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId: command.datasetReviewId },
        }),
        MarkDatasetReviewAsPublished.foldState,
        MarkDatasetReviewAsPublished.decide,
      ),
    }
  })

export const commandsLayer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
