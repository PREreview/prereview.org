import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const input = {
  datasetReviewId: Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d'),
  authorId: OrcidId.OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputDifferentDatasetReviewId = {
  ...input,
  datasetReviewId: Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931'),
} satisfies _.Input

const inputDifferentAuthorId = {
  ...input,
  authorId: OrcidId.OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const now = Temporal.Now.instant()

const started = new Events.DatasetReviewWasStarted({
  authorId: input.authorId,
  datasetId: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
  datasetReviewId: input.datasetReviewId,
})
const declaredYes = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'yes', detail: Option.none() },
  datasetReviewId: input.datasetReviewId,
})
const declaredYesWithDetail = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'yes', detail: Option.some(NonEmptyString.NonEmptyString('Some details')) },
  datasetReviewId: input.datasetReviewId,
})
const declaredNo = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'no' },
  datasetReviewId: input.datasetReviewId,
})
const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})
const published = new Events.DatasetReviewWasPublished({
  datasetReviewId: input.datasetReviewId,
  publicationDate: now.toZonedDateTimeISO('UTC').toPlainDate(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted())],
  ['not declared', input, [started], Either.right({ _tag: 'NotAnswered' })],
  [
    'different dataset review ID',
    inputDifferentDatasetReviewId,
    [started],
    Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()),
  ],
  [
    'different author ID',
    inputDifferentAuthorId,
    [started],
    Either.left(new DatasetReviews.DatasetReviewWasStartedByAnotherUser()),
  ],
  [
    'declared yes',
    input,
    [started, declaredYes],
    Either.right({ _tag: 'AiWasUsed', generativeAiIdeasDetails: Option.none() }),
  ],
  [
    'declared yes with a detail',
    input,
    [started, declaredYesWithDetail],
    Either.right({
      _tag: 'AiWasUsed',
      generativeAiIdeasDetails: Option.some(NonEmptyString.NonEmptyString('Some details')),
    }),
  ],
  ['declared no', input, [started, declaredNo], Either.right({ _tag: 'AiWasNotUsed' })],
  [
    'declared more than once',
    input,
    [started, declaredYesWithDetail, declaredNo],
    Either.right({ _tag: 'AiWasNotUsed' }),
  ],
  [
    'publication requested',
    input,
    [started, declaredYes, publicationRequested],
    Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    input,
    [started, declaredYes, publicationRequested, published],
    Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
