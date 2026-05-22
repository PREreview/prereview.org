import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Commands from '../../../src/Commands.ts'
import * as _ from '../../../src/DatasetReviews/Commands/AnswerIfOthersNeedToBeListedOnTheReview.ts'
import * as Errors from '../../../src/DatasetReviews/Errors.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const input = {
  answer: 'yes',
  datasetReviewId: Uuid('5871bddf-a2ff-4dd8-9e63-c42b4a6df684'),
  userId: OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputDifferentAnswer = {
  ...input,
  answer: 'no',
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

const answered = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: input.answer,
  datasetReviewId: input.datasetReviewId,
})

const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})

const published = new Events.DatasetReviewWasPublished({
  publicationDate: Temporal.Now.plainDateISO(),
  datasetReviewId: input.datasetReviewId,
})

test.fails.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Either.Either<Option.Option<Events.Event>, _.Error | Commands.UnableToHandleCommand>,
  ]
>([
  ['no events', [], input, Either.left(new Errors.DatasetReviewHasNotBeenStarted())],
  [
    'not answered',
    [started],
    input,
    Either.right(Option.some(new Events.AnsweredIfOthersNeedToBeListedOnTheReview(input))),
  ],
  ['same answer', [started, answered], input, Either.right(Option.none())],
  [
    'different answer',
    [started, answered],
    inputDifferentAnswer,
    Either.right(Option.some(new Events.AnsweredIfOthersNeedToBeListedOnTheReview(inputDifferentAnswer))),
  ],
  [
    'different dataset review ID',
    [started],
    inputDifferentDatasetReviewId,
    Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
  ],
  [
    'different user ID',
    [started],
    inputDifferentUserId,
    Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' })),
  ],
  [
    'publication requested',
    [started, answered, publicationRequested],
    input,
    Either.left(new Errors.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    [started, answered, publicationRequested, published],
    input,
    Either.left(new Errors.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, authorize, decide } = _.AnswerIfOthersNeedToBeListedOnTheReview

  const state = foldState(events, input)

  const actual = authorize(state, input)
    ? decide(state, input)
    : Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' }))

  expect(actual).toStrictEqual(expected)
})
