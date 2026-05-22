import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

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
const answeredYes = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId: input.datasetReviewId,
})
const answeredNo = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'no',
  datasetReviewId: input.datasetReviewId,
})
const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})
const published = new Events.DatasetReviewWasPublished({
  datasetReviewId: input.datasetReviewId,
  publicationDate: now.toZonedDateTimeISO('UTC').toPlainDate(),
})

test.fails.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted())],
  ['not answered', input, [started], Either.left(new DatasetReviews.DatasetReviewDoesNotNeedInvitationsToAppear())],
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
    'answered no',
    input,
    [started, answeredNo],
    Either.left(new DatasetReviews.DatasetReviewDoesNotNeedInvitationsToAppear()),
  ],
  ['answered yes', input, [started, answeredYes], Either.void],
  [
    'publication requested',
    input,
    [started, answeredYes, publicationRequested],
    Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    input,
    [started, answeredYes, publicationRequested, published],
    Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
