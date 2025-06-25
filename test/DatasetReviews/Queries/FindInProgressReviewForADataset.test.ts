import { describe, expect, test } from '@jest/globals'
import { Array, Option } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/FindInProgressReviewForADataset.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'

const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const resourceId = Uuid.Uuid('b005c394-b9a5-4713-b6a9-bafc8467c3f4')
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId })
const publicationWasRequested = new DatasetReviews.PublicationWasRequested()
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished()

describe('FindInProgressReviewForADataset', () => {
  describe('when at least one review needs further user input', () => {
    test('returns the review', () => {
      const events = [{ event: datasetReviewWasStarted, resourceId }]

      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.some(resourceId))
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
      {
        event: new DatasetReviews.DatasetReviewWasStarted({
          authorId: Orcid.Orcid('0000-0002-6109-0367'),
          datasetId,
        }),
        resourceId,
      },
    ]

    test('returns nothing', () => {
      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.none())
    })
  })

  describe('when in-progress reviews are for other datasets', () => {
    test('returns nothing', () => {
      const events = [
        {
          event: new DatasetReviews.DatasetReviewWasStarted({
            authorId,
            datasetId: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.9ghx3ffhb') }),
          }),
          resourceId,
        },
      ]

      const actual = _.FindInProgressReviewForADataset(events)(authorId, datasetId)

      expect(actual).toStrictEqual(Option.none())
    })
  })

  describe.each([
    ['completed', [datasetReviewWasStarted, publicationWasRequested, datasetReviewWasPublished]],
    // ['has publicationWasRequested', [publicationWasRequested]],
    // ['has datasetReviewWasPublished', [datasetReviewWasPublished]],
  ])('when no user input is needed for a comment (%s)', (_name, events) => {
    test.failing('returns nothing', () => {
      const actual = _.FindInProgressReviewForADataset(Array.map(events, event => ({ event, resourceId })))(
        authorId,
        datasetId,
      )

      expect(actual).toStrictEqual(Option.none())
    })
  })
})
