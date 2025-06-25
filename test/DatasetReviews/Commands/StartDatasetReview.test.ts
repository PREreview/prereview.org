import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either } from 'effect'
import * as Errors from '../../../src/DatasetReviews/Commands/Errors.js'
import * as _ from '../../../src/DatasetReviews/Commands/StartDatasetReview.js'
import * as Events from '../../../src/DatasetReviews/Events.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid } from '../../../src/types/index.js'

const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new Events.DatasetReviewWasStarted({ authorId, datasetId })

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
    const result = _.decide(new _.NotStarted(), { authorId, datasetId })

    expect(result).toStrictEqual(Either.right([new Events.DatasetReviewWasStarted({ authorId, datasetId })]))
  })

  test('has already been started', () => {
    const result = _.decide(new _.HasBeenStarted(), { authorId, datasetId })

    expect(result).toStrictEqual(Either.left(new Errors.DatasetReviewWasAlreadyStarted()))
  })
})
