import { Array, Either, flow, Option } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { Uuid } from '../../types/index.ts'
import type { NextExpectedCommand } from './GetNextExpectedCommandForAUserOnADatasetReview.ts'

export interface Input {
  readonly datasetReviewId: Uuid.Uuid
  readonly command: NextExpectedCommand
}

export type Result = Option.Option<NextExpectedCommand>

const createFilter = ({ datasetReviewId }: Input) =>
  Events.EventFilter([
    {
      types: ['AnsweredIfOthersNeedToBeListedOnTheReview'],
      predicates: { datasetReviewId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  const othersNeedToBeListed = Option.exists(Array.last(filteredEvents), ({ answer }) => answer === 'yes')

  const steps = Array.filter(
    Steps,
    step => step !== 'AddInvitationToAppearOnADatasetReviewToTheList' || othersNeedToBeListed,
  )

  return Option.flatMap(
    Array.findFirstIndex(steps, step => step === input.command),
    index => Array.get(steps, index - 1),
  )
}

const Steps = [
  'RateTheQuality',
  'AnswerIfTheDatasetFollowsFairAndCarePrinciples',
  'AnswerIfTheDatasetHasEnoughMetadata',
  'AnswerIfTheDatasetHasTrackedChanges',
  'AnswerIfTheDatasetHasDataCensoredOrDeleted',
  'AnswerIfTheDatasetIsAppropriateForThisKindOfResearch',
  'AnswerIfTheDatasetSupportsRelatedConclusions',
  'AnswerIfTheDatasetIsDetailedEnough',
  'AnswerIfTheDatasetIsErrorFree',
  'AnswerIfTheDatasetMattersToItsAudience',
  'AnswerIfTheDatasetIsReadyToBeShared',
  'AnswerIfTheDatasetIsMissingAnything',
  'ChoosePersona',
  'AnswerIfOthersNeedToBeListedOnTheReview',
  'AddInvitationToAppearOnADatasetReviewToTheList',
  'DeclareIfAiWasUsedToGenerateNewIdeas',
  'DeclareCompetingInterests',
  'DeclareFollowingCodeOfConduct',
  'PublishDatasetReview',
] as const satisfies ReadonlyArray<NextExpectedCommand>

export const GetPreviousCommandForAUserOnADatasetReview = Queries.OnDemandQuery({
  name: 'DatasetReviews.getPreviousCommandForAUserOnADatasetReview',
  createFilter,
  query: flow(query, Either.right),
})
