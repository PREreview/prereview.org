import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/StartDatasetReview.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })

describe('foldState', () => {
  test('not yet started', () => {
    const state = _.foldState([])

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
      Either.right([new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })]),
    )
  })

  test('has already been started', () => {
    const result = _.decide(new _.HasBeenStarted(), { authorId, datasetId, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewWasAlreadyStarted()))
  })
})
