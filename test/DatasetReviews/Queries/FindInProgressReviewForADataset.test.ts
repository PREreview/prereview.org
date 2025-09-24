import { describe, expect, test } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/FindInProgressReviewForADataset.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const publicationWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({ datasetReviewId })
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('FindInProgressReviewForADataset', () => {
  describe('when at least one review needs further user input', () => {
    test('returns the review', () => {
      const events = [datasetReviewWasStarted]

      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.some(datasetReviewId))
    })
  })

  describe('when there are no reviews', () => {
    test('returns nothing', () => {
      const actual = _.FindInProgressReviewForADataset([])(authorId, datasetId)

      expect(actual).toStrictEqual(Option.none())
    })
  })

  describe('when in-progress reviews are by other users', () => {
    const events = [
      new DatasetReviews.DatasetReviewWasStarted({
        authorId: OrcidId.OrcidId('0000-0002-6109-0367'),
        datasetId,
        datasetReviewId,
      }),
    ]

    test('returns nothing', () => {
      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.none())
    })
  })

  describe('when in-progress reviews are for other datasets', () => {
    test('returns nothing', () => {
      const events = [
        new DatasetReviews.DatasetReviewWasStarted({
          authorId,
          datasetId: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.9ghx3ffhb') }),
          datasetReviewId,
        }),
      ]

      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.none())
    })
  })

  describe.each([
    ['completed', [datasetReviewWasStarted, publicationWasRequested, datasetReviewWasPublished]],
    ['has publicationWasRequested', [publicationWasRequested]],
    ['has datasetReviewWasPublished', [datasetReviewWasPublished]],
  ])('when no user input is needed for a comment (%s)', (_name, events) => {
    test('returns nothing', () => {
      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.none())
    })
  })
})
