import { expect, test } from '@effect/vitest'
import { Either } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/AreThereMultipleAuthorsOnAReview.ts'
import * as Events from '../../../src/Events.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const input = Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d') satisfies _.Input

const inputDifferentDatasetReviewId = Uuid('f7b3a56e-d320-484c-8452-83a609357931') satisfies _.Input

const answeredYes = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId: input,
})
const answeredNo = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'no',
  datasetReviewId: input,
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, _.Result]>([
  ['no events', [], input, false],
  ['answered yes', [answeredYes], input, true],
  ['answered yes, different dataset review ID', [answeredYes], inputDifferentDatasetReviewId, false],
  ['answered no', [answeredNo], input, false],
])('%s', (_name, events, input, expected) => {
  const { query } = _.AreThereMultipleAuthorsOnAReview

  const actual = query(events, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
