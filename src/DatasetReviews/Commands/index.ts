import { Context, Data, Effect, type Either, Layer, Option, pipe, Scope, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import type { Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'
import * as AnswerIfTheDatasetFollowsFairAndCarePrinciples from './AnswerIfTheDatasetFollowsFairAndCarePrinciples.ts'
import * as AnswerIfTheDatasetHasDataCensoredOrDeleted from './AnswerIfTheDatasetHasDataCensoredOrDeleted.ts'
import * as AnswerIfTheDatasetHasEnoughMetadata from './AnswerIfTheDatasetHasEnoughMetadata.ts'
import * as AnswerIfTheDatasetHasTrackedChanges from './AnswerIfTheDatasetHasTrackedChanges.ts'
import * as AnswerIfTheDatasetIsAppropriateForThisKindOfResearch from './AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.ts'
import * as AnswerIfTheDatasetIsDetailedEnough from './AnswerIfTheDatasetIsDetailedEnough.ts'
import * as AnswerIfTheDatasetIsErrorFree from './AnswerIfTheDatasetIsErrorFree.ts'
import * as AnswerIfTheDatasetIsMissingAnything from './AnswerIfTheDatasetIsMissingAnything.ts'
import * as AnswerIfTheDatasetIsReadyToBeShared from './AnswerIfTheDatasetIsReadyToBeShared.ts'
import * as AnswerIfTheDatasetMattersToItsAudience from './AnswerIfTheDatasetMattersToItsAudience.ts'
import * as AnswerIfTheDatasetSupportsRelatedConclusions from './AnswerIfTheDatasetSupportsRelatedConclusions.ts'
import * as ChoosePersona from './ChoosePersona.ts'
import * as DeclareCompetingInterests from './DeclareCompetingInterests.ts'
import * as DeclareFollowingCodeOfConduct from './DeclareFollowingCodeOfConduct.ts'
import * as MarkDatasetReviewAsPublished from './MarkDatasetReviewAsPublished.ts'
import * as MarkDoiAsActivated from './MarkDoiAsActivated.ts'
import * as MarkDoiAsAssigned from './MarkDoiAsAssigned.ts'
import * as MarkRecordAsPublishedOnZenodo from './MarkRecordAsPublishedOnZenodo.ts'
import * as MarkRecordCreatedOnZenodo from './MarkRecordCreatedOnZenodo.ts'
import * as PublishDatasetReview from './PublishDatasetReview.ts'
import * as RateTheQuality from './RateTheQuality.ts'
import * as StartDatasetReview from './StartDatasetReview.ts'

export class DatasetReviewCommands extends Context.Tag('DatasetReviewCommands')<
  DatasetReviewCommands,
  {
    startDatasetReview: CommandHandler<StartDatasetReview.StartDatasetReview, Errors.DatasetReviewWasAlreadyStarted>
    rateTheQuality: CommandHandler<RateTheQuality.Command, RateTheQuality.Error>
    answerIfTheDatasetFollowsFairAndCarePrinciples: CommandHandler<
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Command,
      AnswerIfTheDatasetFollowsFairAndCarePrinciples.Error
    >
    answerIfTheDatasetHasDataCensoredOrDeleted: CommandHandler<
      AnswerIfTheDatasetHasDataCensoredOrDeleted.Command,
      AnswerIfTheDatasetHasDataCensoredOrDeleted.Error
    >
    answerIfTheDatasetHasEnoughMetadata: CommandHandler<
      AnswerIfTheDatasetHasEnoughMetadata.Command,
      AnswerIfTheDatasetHasEnoughMetadata.Error
    >
    answerIfTheDatasetHasTrackedChanges: CommandHandler<
      AnswerIfTheDatasetHasTrackedChanges.Command,
      AnswerIfTheDatasetHasTrackedChanges.Error
    >
    answerIfTheDatasetIsAppropriateForThisKindOfResearch: CommandHandler<
      AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.Command,
      AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.Error
    >
    answerIfTheDatasetSupportsRelatedConclusions: CommandHandler<
      AnswerIfTheDatasetSupportsRelatedConclusions.Command,
      AnswerIfTheDatasetSupportsRelatedConclusions.Error
    >
    answerIfTheDatasetIsDetailedEnough: CommandHandler<
      AnswerIfTheDatasetIsDetailedEnough.Command,
      AnswerIfTheDatasetIsDetailedEnough.Error
    >
    answerIfTheDatasetIsErrorFree: CommandHandler<
      AnswerIfTheDatasetIsErrorFree.Command,
      AnswerIfTheDatasetIsErrorFree.Error
    >
    answerIfTheDatasetMattersToItsAudience: CommandHandler<
      AnswerIfTheDatasetMattersToItsAudience.Command,
      AnswerIfTheDatasetMattersToItsAudience.Error
    >
    answerIfTheDatasetIsReadyToBeShared: CommandHandler<
      AnswerIfTheDatasetIsReadyToBeShared.Command,
      AnswerIfTheDatasetIsReadyToBeShared.Error
    >
    answerIfTheDatasetIsMissingAnything: CommandHandler<
      AnswerIfTheDatasetIsMissingAnything.Command,
      AnswerIfTheDatasetIsMissingAnything.Error
    >
    choosePersona: CommandHandler<ChoosePersona.Command, ChoosePersona.Error>
    declareCompetingInterests: CommandHandler<DeclareCompetingInterests.Command, DeclareCompetingInterests.Error>
    declareFollowingCodeOfConduct: CommandHandler<
      DeclareFollowingCodeOfConduct.Command,
      DeclareFollowingCodeOfConduct.Error
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
) => Effect.Effect<void, NotAuthorizedToRunCommand | UnableToHandleCommand | Error>

export class NotAuthorizedToRunCommand extends Data.TaggedError('NotAuthorizedToRunCommand')<{ cause?: unknown }> {}

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const {
  startDatasetReview,
  rateTheQuality,
  answerIfTheDatasetFollowsFairAndCarePrinciples,
  answerIfTheDatasetHasDataCensoredOrDeleted,
  answerIfTheDatasetHasEnoughMetadata,
  answerIfTheDatasetHasTrackedChanges,
  answerIfTheDatasetIsAppropriateForThisKindOfResearch,
  answerIfTheDatasetSupportsRelatedConclusions,
  answerIfTheDatasetIsDetailedEnough,
  answerIfTheDatasetIsErrorFree,
  answerIfTheDatasetMattersToItsAudience,
  answerIfTheDatasetIsReadyToBeShared,
  answerIfTheDatasetIsMissingAnything,
  choosePersona,
  declareCompetingInterests,
  declareFollowingCodeOfConduct,
  markRecordCreatedOnZenodo,
  markRecordAsPublishedOnZenodo,
  markDoiAsAssigned,
  markDoiAsActivated,
  publishDatasetReview,
  markDatasetReviewAsPublished,
} = Effect.serviceFunctions(DatasetReviewCommands)

const makeDatasetReviewCommands: Effect.Effect<typeof DatasetReviewCommands.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const handleCommand = <
      Event extends Types.Tags<Events.DatasetReviewEvent>,
      State,
      Command extends { datasetReviewId: Uuid.Uuid },
      Error,
    >(
      createFilter: (datasetReviewId: Uuid.Uuid) => Events.EventFilter<Event>,
      foldState: (events: ReadonlyArray<Types.ExtractTag<Events.Event, Event>>, datasetReviewId: Uuid.Uuid) => State,
      authorize: (command: Command) => (state: State) => boolean,
      decide: (command: Command) => (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>,
    ): CommandHandler<Command, Error> =>
      Effect.fn(
        function* (command) {
          const filter = createFilter(command.datasetReviewId)

          const { events, lastKnownEvent } = yield* pipe(
            EventStore.query(filter),
            Effect.andThen(Option.getOrElse(() => ({ events: [], lastKnownEvent: undefined }))),
          )

          yield* pipe(
            Effect.succeed(foldState(events, command.datasetReviewId)),
            Effect.filterOrElse(authorize(command), () => new NotAuthorizedToRunCommand({})),
            Effect.andThen(decide(command)),
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
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        StartDatasetReview.foldState,
        () => () => true,
        StartDatasetReview.decide,
      ),
      rateTheQuality: handleCommand(
        RateTheQuality.createFilter,
        RateTheQuality.foldState,
        RateTheQuality.authorize,
        RateTheQuality.decide,
      ),
      answerIfTheDatasetFollowsFairAndCarePrinciples: handleCommand(
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.createFilter,
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.foldState,
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.authorize,
        AnswerIfTheDatasetFollowsFairAndCarePrinciples.decide,
      ),
      answerIfTheDatasetHasDataCensoredOrDeleted: handleCommand(
        AnswerIfTheDatasetHasDataCensoredOrDeleted.createFilter,
        AnswerIfTheDatasetHasDataCensoredOrDeleted.foldState,
        AnswerIfTheDatasetHasDataCensoredOrDeleted.authorize,
        AnswerIfTheDatasetHasDataCensoredOrDeleted.decide,
      ),
      answerIfTheDatasetHasEnoughMetadata: handleCommand(
        AnswerIfTheDatasetHasEnoughMetadata.createFilter,
        AnswerIfTheDatasetHasEnoughMetadata.foldState,
        AnswerIfTheDatasetHasEnoughMetadata.authorize,
        AnswerIfTheDatasetHasEnoughMetadata.decide,
      ),
      answerIfTheDatasetHasTrackedChanges: handleCommand(
        AnswerIfTheDatasetHasTrackedChanges.createFilter,
        AnswerIfTheDatasetHasTrackedChanges.foldState,
        AnswerIfTheDatasetHasTrackedChanges.authorize,
        AnswerIfTheDatasetHasTrackedChanges.decide,
      ),
      answerIfTheDatasetIsAppropriateForThisKindOfResearch: handleCommand(
        AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.createFilter,
        AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.foldState,
        AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.authorize,
        AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.decide,
      ),
      answerIfTheDatasetSupportsRelatedConclusions: handleCommand(
        AnswerIfTheDatasetSupportsRelatedConclusions.createFilter,
        AnswerIfTheDatasetSupportsRelatedConclusions.foldState,
        AnswerIfTheDatasetSupportsRelatedConclusions.authorize,
        AnswerIfTheDatasetSupportsRelatedConclusions.decide,
      ),
      answerIfTheDatasetIsDetailedEnough: handleCommand(
        AnswerIfTheDatasetIsDetailedEnough.createFilter,
        AnswerIfTheDatasetIsDetailedEnough.foldState,
        AnswerIfTheDatasetIsDetailedEnough.authorize,
        AnswerIfTheDatasetIsDetailedEnough.decide,
      ),
      answerIfTheDatasetIsErrorFree: handleCommand(
        AnswerIfTheDatasetIsErrorFree.createFilter,
        AnswerIfTheDatasetIsErrorFree.foldState,
        AnswerIfTheDatasetIsErrorFree.authorize,
        AnswerIfTheDatasetIsErrorFree.decide,
      ),
      answerIfTheDatasetMattersToItsAudience: handleCommand(
        AnswerIfTheDatasetMattersToItsAudience.createFilter,
        AnswerIfTheDatasetMattersToItsAudience.foldState,
        AnswerIfTheDatasetMattersToItsAudience.authorize,
        AnswerIfTheDatasetMattersToItsAudience.decide,
      ),
      answerIfTheDatasetIsReadyToBeShared: handleCommand(
        AnswerIfTheDatasetIsReadyToBeShared.createFilter,
        AnswerIfTheDatasetIsReadyToBeShared.foldState,
        AnswerIfTheDatasetIsReadyToBeShared.authorize,
        AnswerIfTheDatasetIsReadyToBeShared.decide,
      ),
      answerIfTheDatasetIsMissingAnything: handleCommand(
        AnswerIfTheDatasetIsMissingAnything.createFilter,
        AnswerIfTheDatasetIsMissingAnything.foldState,
        AnswerIfTheDatasetIsMissingAnything.authorize,
        AnswerIfTheDatasetIsMissingAnything.decide,
      ),
      choosePersona: handleCommand(
        ChoosePersona.createFilter,
        ChoosePersona.foldState,
        ChoosePersona.authorize,
        ChoosePersona.decide,
      ),
      declareCompetingInterests: handleCommand(
        DeclareCompetingInterests.createFilter,
        DeclareCompetingInterests.foldState,
        DeclareCompetingInterests.authorize,
        DeclareCompetingInterests.decide,
      ),
      declareFollowingCodeOfConduct: handleCommand(
        DeclareFollowingCodeOfConduct.createFilter,
        DeclareFollowingCodeOfConduct.foldState,
        DeclareFollowingCodeOfConduct.authorize,
        DeclareFollowingCodeOfConduct.decide,
      ),
      markRecordCreatedOnZenodo: handleCommand(
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        MarkRecordCreatedOnZenodo.foldState,
        () => () => true,
        MarkRecordCreatedOnZenodo.decide,
      ),
      markRecordAsPublishedOnZenodo: handleCommand(
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        MarkRecordAsPublishedOnZenodo.foldState,
        () => () => true,
        MarkRecordAsPublishedOnZenodo.decide,
      ),
      markDoiAsAssigned: handleCommand(
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        MarkDoiAsAssigned.foldState,
        () => () => true,
        MarkDoiAsAssigned.decide,
      ),
      markDoiAsActivated: handleCommand(
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        MarkDoiAsActivated.foldState,
        () => () => true,
        MarkDoiAsActivated.decide,
      ),
      publishDatasetReview: handleCommand(
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        PublishDatasetReview.foldState,
        () => () => true,
        PublishDatasetReview.decide,
      ),
      markDatasetReviewAsPublished: handleCommand(
        datasetReviewId => ({
          types: Events.DatasetReviewEventTypes,
          predicates: { datasetReviewId },
        }),
        MarkDatasetReviewAsPublished.foldState,
        () => () => true,
        MarkDatasetReviewAsPublished.decide,
      ),
    }
  })

export const commandsLayer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
