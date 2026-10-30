import { Array, Context, Data, Effect, type Either, Layer, Option, pipe, Scope, Struct } from 'effect'
import { Clubs } from '../../Clubs/index.ts'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import type { Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'
import { AddInvitationToAppearToTheList } from './AddInvitationToAppearToTheList.ts'
import { AddReviewToAClub } from './AddReviewToAClub.ts'
import { AnswerIfOthersNeedToBeListedOnTheReview } from './AnswerIfOthersNeedToBeListedOnTheReview.ts'
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
import { DeclareIfAiWasUsedToGenerateNewIdeas } from './DeclareIfAiWasUsedToGenerateNewIdeas.ts'
import * as DeclareFollowingCodeOfConduct from './DeclareFollowingCodeOfConduct.ts'
import * as MarkDatasetReviewAsPublished from './MarkDatasetReviewAsPublished.ts'
import * as MarkDoiAsActivated from './MarkDoiAsActivated.ts'
import * as MarkDoiAsAssigned from './MarkDoiAsAssigned.ts'
import * as MarkRecordAsPublishedOnZenodo from './MarkRecordAsPublishedOnZenodo.ts'
import * as MarkRecordCreatedOnZenodo from './MarkRecordCreatedOnZenodo.ts'
import * as PublishDatasetReview from './PublishDatasetReview.ts'
import * as RateTheQuality from './RateTheQuality.ts'
import { RemoveInvitationToAppearFromTheList } from './RemoveInvitationToAppearFromTheList.ts'
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
    answerIfOthersNeedToBeListedOnTheReview: Commands.FromCommand<typeof AnswerIfOthersNeedToBeListedOnTheReview>
    addInvitationToAppearToTheList: Commands.FromCommand<typeof AddInvitationToAppearToTheList>
    removeInvitationToAppearFromTheList: Commands.FromCommand<typeof RemoveInvitationToAppearFromTheList>
    declareIfAiWasUsedToGenerateNewIdeas: Commands.FromCommand<typeof DeclareIfAiWasUsedToGenerateNewIdeas>
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
    addReviewToAClub: Commands.FromCommand<ReturnType<typeof AddReviewToAClub>>
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

export const startDatasetReview = (...args: Parameters<(typeof DatasetReviewCommands.Service)['startDatasetReview']>) =>
  Effect.flatMap(DatasetReviewCommands, service => service.startDatasetReview(...args))

export const rateTheQuality = (...args: Parameters<(typeof DatasetReviewCommands.Service)['rateTheQuality']>) =>
  Effect.flatMap(DatasetReviewCommands, service => service.rateTheQuality(...args))

export const answerIfTheDatasetFollowsFairAndCarePrinciples = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetFollowsFairAndCarePrinciples']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetFollowsFairAndCarePrinciples(...args))

export const answerIfTheDatasetHasDataCensoredOrDeleted = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetHasDataCensoredOrDeleted']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetHasDataCensoredOrDeleted(...args))

export const answerIfTheDatasetHasEnoughMetadata = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetHasEnoughMetadata']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetHasEnoughMetadata(...args))

export const answerIfTheDatasetHasTrackedChanges = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetHasTrackedChanges']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetHasTrackedChanges(...args))

export const answerIfTheDatasetIsAppropriateForThisKindOfResearch = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetIsAppropriateForThisKindOfResearch']>
) =>
  Effect.flatMap(DatasetReviewCommands, service =>
    service.answerIfTheDatasetIsAppropriateForThisKindOfResearch(...args),
  )

export const answerIfTheDatasetSupportsRelatedConclusions = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetSupportsRelatedConclusions']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetSupportsRelatedConclusions(...args))

export const answerIfTheDatasetIsDetailedEnough = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetIsDetailedEnough']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetIsDetailedEnough(...args))

export const answerIfTheDatasetIsErrorFree = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetIsErrorFree']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetIsErrorFree(...args))

export const answerIfTheDatasetMattersToItsAudience = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetMattersToItsAudience']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetMattersToItsAudience(...args))

export const answerIfTheDatasetIsReadyToBeShared = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetIsReadyToBeShared']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetIsReadyToBeShared(...args))

export const answerIfTheDatasetIsMissingAnything = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfTheDatasetIsMissingAnything']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfTheDatasetIsMissingAnything(...args))

export const choosePersona = (...args: Parameters<(typeof DatasetReviewCommands.Service)['choosePersona']>) =>
  Effect.flatMap(DatasetReviewCommands, service => service.choosePersona(...args))

export const answerIfOthersNeedToBeListedOnTheReview = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['answerIfOthersNeedToBeListedOnTheReview']>
) => Effect.flatMap(DatasetReviewCommands, service => service.answerIfOthersNeedToBeListedOnTheReview(...args))

export const addInvitationToAppearToTheList = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['addInvitationToAppearToTheList']>
) => Effect.flatMap(DatasetReviewCommands, service => service.addInvitationToAppearToTheList(...args))

export const removeInvitationToAppearFromTheList = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['removeInvitationToAppearFromTheList']>
) => Effect.flatMap(DatasetReviewCommands, service => service.removeInvitationToAppearFromTheList(...args))

export const declareIfAiWasUsedToGenerateNewIdeas = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['declareIfAiWasUsedToGenerateNewIdeas']>
) => Effect.flatMap(DatasetReviewCommands, service => service.declareIfAiWasUsedToGenerateNewIdeas(...args))

export const declareCompetingInterests = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['declareCompetingInterests']>
) => Effect.flatMap(DatasetReviewCommands, service => service.declareCompetingInterests(...args))

export const declareFollowingCodeOfConduct = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['declareFollowingCodeOfConduct']>
) => Effect.flatMap(DatasetReviewCommands, service => service.declareFollowingCodeOfConduct(...args))

export const markRecordCreatedOnZenodo = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['markRecordCreatedOnZenodo']>
) => Effect.flatMap(DatasetReviewCommands, service => service.markRecordCreatedOnZenodo(...args))

export const markRecordAsPublishedOnZenodo = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['markRecordAsPublishedOnZenodo']>
) => Effect.flatMap(DatasetReviewCommands, service => service.markRecordAsPublishedOnZenodo(...args))

export const markDoiAsAssigned = (...args: Parameters<(typeof DatasetReviewCommands.Service)['markDoiAsAssigned']>) =>
  Effect.flatMap(DatasetReviewCommands, service => service.markDoiAsAssigned(...args))

export const markDoiAsActivated = (...args: Parameters<(typeof DatasetReviewCommands.Service)['markDoiAsActivated']>) =>
  Effect.flatMap(DatasetReviewCommands, service => service.markDoiAsActivated(...args))

export const addReviewToAClub = (...args: Parameters<(typeof DatasetReviewCommands.Service)['addReviewToAClub']>) =>
  Effect.flatMap(DatasetReviewCommands, service => service.addReviewToAClub(...args))

export const publishDatasetReview = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['publishDatasetReview']>
) => Effect.flatMap(DatasetReviewCommands, service => service.publishDatasetReview(...args))

export const markDatasetReviewAsPublished = (
  ...args: Parameters<(typeof DatasetReviewCommands.Service)['markDatasetReviewAsPublished']>
) => Effect.flatMap(DatasetReviewCommands, service => service.markDatasetReviewAsPublished(...args))

const allDatasetReviewEvents = (datasetReviewId: Uuid.Uuid) =>
  Events.EventFilter({
    types: Events.DatasetReviewEventTypes,
    predicates: { datasetReviewId },
  })

const makeDatasetReviewCommands: Effect.Effect<
  typeof DatasetReviewCommands.Service,
  never,
  Clubs | EventStore.EventStore
> = Effect.gen(function* () {
  const clubs = yield* Clubs
  const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  const clubIds = yield* Effect.map(clubs.listClubs, Array.map(Struct.get('id')))

  const handleCommand = <
    Filter extends Events.EventFilter,
    State,
    Command extends { datasetReviewId: Uuid.Uuid },
    Error,
  >(
    createFilter: (datasetReviewId: Uuid.Uuid) => Filter,
    foldState: (events: ReadonlyArray<Events.EventsForFilter<Filter>>, datasetReviewId: Uuid.Uuid) => State,
    authorize: (command: Command) => (state: State) => boolean,
    decide: (command: Command) => (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>,
  ): CommandHandler<Command, Error> =>
    Effect.fn(
      function* (command) {
        const filter = createFilter(command.datasetReviewId)

        const { events, lastKnownPosition } = yield* pipe(
          EventStore.query(filter),
          Effect.map(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
        )

        yield* pipe(
          Effect.succeed(foldState(events, command.datasetReviewId)),
          Effect.filterOrElse(authorize(command), () => new NotAuthorizedToRunCommand({})),
          Effect.andThen(decide(command)),
          Effect.tap(
            Option.match({
              onNone: () => Effect.void,
              onSome: event =>
                EventStore.appendIf(event, { filter, lastKnownPosition: Option.fromNullable(lastKnownPosition) }),
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
      allDatasetReviewEvents,
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
    answerIfOthersNeedToBeListedOnTheReview: yield* Commands.makeCommand(AnswerIfOthersNeedToBeListedOnTheReview),
    addInvitationToAppearToTheList: yield* Commands.makeCommand(AddInvitationToAppearToTheList),
    removeInvitationToAppearFromTheList: yield* Commands.makeCommand(RemoveInvitationToAppearFromTheList),
    declareIfAiWasUsedToGenerateNewIdeas: yield* Commands.makeCommand(DeclareIfAiWasUsedToGenerateNewIdeas),
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
      allDatasetReviewEvents,
      MarkRecordCreatedOnZenodo.foldState,
      () => () => true,
      MarkRecordCreatedOnZenodo.decide,
    ),
    markRecordAsPublishedOnZenodo: handleCommand(
      allDatasetReviewEvents,
      MarkRecordAsPublishedOnZenodo.foldState,
      () => () => true,
      MarkRecordAsPublishedOnZenodo.decide,
    ),
    markDoiAsAssigned: handleCommand(
      allDatasetReviewEvents,
      MarkDoiAsAssigned.foldState,
      () => () => true,
      MarkDoiAsAssigned.decide,
    ),
    markDoiAsActivated: handleCommand(
      allDatasetReviewEvents,
      MarkDoiAsActivated.foldState,
      () => () => true,
      MarkDoiAsActivated.decide,
    ),
    addReviewToAClub: yield* Commands.makeCommand(AddReviewToAClub(clubIds)),
    publishDatasetReview: handleCommand(
      allDatasetReviewEvents,
      PublishDatasetReview.foldState,
      () => () => true,
      PublishDatasetReview.decide,
    ),
    markDatasetReviewAsPublished: handleCommand(
      allDatasetReviewEvents,
      MarkDatasetReviewAsPublished.foldState,
      () => () => true,
      MarkDatasetReviewAsPublished.decide,
    ),
  }
})

export const commandsLayer = Layer.effect(DatasetReviewCommands, makeDatasetReviewCommands)
