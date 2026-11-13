import { expect, test } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Result, Option } from 'effect'
import * as Commands from '../../../../src/Commands.ts'
import * as _ from '../../../../src/Domain/DatasetReviews/Commands/RemoveInvitationToAppearFromTheList.ts'
import * as Errors from '../../../../src/Domain/DatasetReviews/Errors.ts'
import * as Datasets from '../../../../src/Domain/Datasets/index.ts'
import * as Events from '../../../../src/Events.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'
import { Uuid } from '../../../../src/types/Uuid.ts'

const input = {
  invitationId: Uuid('000b3291-ee40-4d00-b43f-844d26831f7c'),
  datasetReviewId: Uuid('5871bddf-a2ff-4dd8-9e63-c42b4a6df684'),
  userId: OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputDifferentInvitationId = {
  ...input,
  invitationId: Uuid('432fcb89-f5e6-4ea1-a366-19917be054c7'),
} satisfies _.Input

const inputDifferentDatasetReviewId = {
  ...input,
  datasetReviewId: Uuid('2f1254b2-1aea-4220-9a21-e119c9e7005e'),
} satisfies _.Input

const inputDifferentUserId = {
  ...input,
  userId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const started = new Events.DatasetReviewWasStarted({
  authorId: input.userId,
  datasetId: new Datasets.DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
  datasetReviewId: input.datasetReviewId,
})

const answeredYes = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId: input.datasetReviewId,
})

const answeredNo = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'no',
  datasetReviewId: input.datasetReviewId,
})

const addedToList = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
  contactDetails: Option.none(),
})

const removedFromList = new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
})

const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})

const published = new Events.DatasetReviewWasPublished({
  publicationDate: Temporal.Now.plainDateISO(),
  datasetReviewId: input.datasetReviewId,
})

test.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Result.Result<Option.Option<Events.Event>, _.Error | Commands.UnableToHandleCommand>,
  ]
>([
  ['no events', [], input, Result.fail(new Errors.DatasetReviewHasNotBeenStarted())],
  ['not answered', [started], input, Result.fail(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear())],
  ['answered no', [started, answeredNo], input, Result.fail(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear())],
  ['answered yes, not added', [started, answeredYes], input, Result.succeed(Option.none())],
  [
    'answered yes, was added',
    [started, answeredYes, addedToList],
    input,
    Result.succeed(Option.some(new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList(input))),
  ],
  [
    'answered yes, already added with different invitation ID',
    [started, answeredYes, addedToList],
    inputDifferentInvitationId,
    Result.succeed(Option.none()),
  ],
  [
    'answered yes, already added and removed with same invitation ID',
    [started, answeredYes, addedToList, removedFromList],
    input,
    Result.succeed(Option.none()),
  ],
  [
    'answered yes, already added and removed with different invitation ID',
    [started, answeredYes, addedToList, removedFromList],
    inputDifferentInvitationId,
    Result.succeed(Option.none()),
  ],
  [
    'different dataset review ID',
    [started],
    inputDifferentDatasetReviewId,
    Result.fail(new Errors.DatasetReviewHasNotBeenStarted()),
  ],
  [
    'different user ID',
    [started],
    inputDifferentUserId,
    Result.fail(new Commands.UnableToHandleCommand({ cause: 'unauthorized' })),
  ],
  [
    'publication requested',
    [started, answeredYes, publicationRequested],
    input,
    Result.fail(new Errors.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    [started, answeredYes, publicationRequested, published],
    input,
    Result.fail(new Errors.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, authorize, decide } = _.RemoveInvitationToAppearFromTheList

  const state = foldState(events, input)

  const actual = authorize(state, input)
    ? decide(state, input)
    : Result.fail(new Commands.UnableToHandleCommand({ cause: 'unauthorized' }))

  expect(actual).toStrictEqual(expected)
})
