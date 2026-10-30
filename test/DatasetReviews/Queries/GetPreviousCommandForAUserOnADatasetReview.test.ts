import { expect, test } from '../../vitest.ts'
import { Either, Option } from 'effect'
import type * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/GetPreviousCommandForAUserOnADatasetReview.ts'
import * as Events from '../../../src/Events.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const datasetReviewId = Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')

const otherDatasetReviewId = Uuid('f7b3a56e-d320-484c-8452-83a609357931')

const answeredYes = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({ answer: 'yes', datasetReviewId })

const answeredNo = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({ answer: 'no', datasetReviewId })

const answeredYesOnAnotherReview = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId: otherDatasetReviewId,
})

test.each<[string, ReadonlyArray<Events.Event>, DatasetReviews.NextExpectedCommand, _.Result]>([
  ['first step', [], 'RateTheQuality', Option.none()],
  ['FAIR and CARE', [], 'AnswerIfTheDatasetFollowsFairAndCarePrinciples', Option.some('RateTheQuality')],
  [
    'enough metadata',
    [],
    'AnswerIfTheDatasetHasEnoughMetadata',
    Option.some('AnswerIfTheDatasetFollowsFairAndCarePrinciples'),
  ],
  ['tracked changes', [], 'AnswerIfTheDatasetHasTrackedChanges', Option.some('AnswerIfTheDatasetHasEnoughMetadata')],
  [
    'data censored or deleted',
    [],
    'AnswerIfTheDatasetHasDataCensoredOrDeleted',
    Option.some('AnswerIfTheDatasetHasTrackedChanges'),
  ],
  [
    'appropriate for this kind of research',
    [],
    'AnswerIfTheDatasetIsAppropriateForThisKindOfResearch',
    Option.some('AnswerIfTheDatasetHasDataCensoredOrDeleted'),
  ],
  [
    'supports related conclusions',
    [],
    'AnswerIfTheDatasetSupportsRelatedConclusions',
    Option.some('AnswerIfTheDatasetIsAppropriateForThisKindOfResearch'),
  ],
  [
    'detailed enough',
    [],
    'AnswerIfTheDatasetIsDetailedEnough',
    Option.some('AnswerIfTheDatasetSupportsRelatedConclusions'),
  ],
  ['error free', [], 'AnswerIfTheDatasetIsErrorFree', Option.some('AnswerIfTheDatasetIsDetailedEnough')],
  [
    'matters to its audience',
    [],
    'AnswerIfTheDatasetMattersToItsAudience',
    Option.some('AnswerIfTheDatasetIsErrorFree'),
  ],
  [
    'ready to be shared',
    [],
    'AnswerIfTheDatasetIsReadyToBeShared',
    Option.some('AnswerIfTheDatasetMattersToItsAudience'),
  ],
  ['missing anything', [], 'AnswerIfTheDatasetIsMissingAnything', Option.some('AnswerIfTheDatasetIsReadyToBeShared')],
  ['persona', [], 'ChoosePersona', Option.some('AnswerIfTheDatasetIsMissingAnything')],
  ['others need to be listed', [], 'AnswerIfOthersNeedToBeListedOnTheReview', Option.some('ChoosePersona')],
  [
    'add an invitation',
    [answeredYes],
    'AddInvitationToAppearOnADatasetReviewToTheList',
    Option.some('AnswerIfOthersNeedToBeListedOnTheReview'),
  ],
  ['add an invitation, without others', [answeredNo], 'AddInvitationToAppearOnADatasetReviewToTheList', Option.none()],
  [
    'use of AI, with others',
    [answeredYes],
    'DeclareIfAiWasUsedToGenerateNewIdeas',
    Option.some('AddInvitationToAppearOnADatasetReviewToTheList'),
  ],
  [
    'use of AI, without others',
    [answeredNo],
    'DeclareIfAiWasUsedToGenerateNewIdeas',
    Option.some('AnswerIfOthersNeedToBeListedOnTheReview'),
  ],
  [
    'use of AI, not answered',
    [],
    'DeclareIfAiWasUsedToGenerateNewIdeas',
    Option.some('AnswerIfOthersNeedToBeListedOnTheReview'),
  ],
  [
    'use of AI, answer changed',
    [answeredYes, answeredNo],
    'DeclareIfAiWasUsedToGenerateNewIdeas',
    Option.some('AnswerIfOthersNeedToBeListedOnTheReview'),
  ],
  [
    'use of AI, others on a different review',
    [answeredYesOnAnotherReview],
    'DeclareIfAiWasUsedToGenerateNewIdeas',
    Option.some('AnswerIfOthersNeedToBeListedOnTheReview'),
  ],
  ['competing interests', [], 'DeclareCompetingInterests', Option.some('DeclareIfAiWasUsedToGenerateNewIdeas')],
  ['code of conduct', [], 'DeclareFollowingCodeOfConduct', Option.some('DeclareCompetingInterests')],
  ['publish', [], 'PublishDatasetReview', Option.some('DeclareFollowingCodeOfConduct')],
])('%s', (_name, events, command, expected) => {
  const { query } = _.GetPreviousCommandForAUserOnADatasetReview

  const actual = query(events, { datasetReviewId, command })

  expect(actual).toStrictEqual(Either.right(expected))
})
