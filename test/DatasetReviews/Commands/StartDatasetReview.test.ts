import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option, Predicate } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/StartDatasetReview.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
    answer: 'no',
    detail: Option.none(),
    datasetReviewId,
  })
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('foldState', () => {
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
    ],
  })('not yet started', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test('already started', () => {
    const events = [started]

    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasBeenStarted())
  })
})

describe('decide', () => {
  test('has not been started', () => {
    const result = _.decide(new _.NotStarted(), { authorId, datasetId, datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId }))),
    )
  })

  test('has already been started', () => {
    const result = _.decide(new _.HasBeenStarted(), { authorId, datasetId, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewWasAlreadyStarted()))
  })
})
