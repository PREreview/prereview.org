import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetAuthor.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const authorId2 = OrcidId.OrcidId('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const datasetReviewWasStarted2 = new DatasetReviews.DatasetReviewWasStarted({
  authorId: authorId2,
  datasetId,
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetAuthor', () => {
  describe('when the dataset review has been started', () => {
    test.prop(
      [
        fc
          .tuple(fc.array(fc.datasetReviewEvent()), fc.datasetReviewWasStarted())
          .map(([events, started]) => Tuple.make(Array.append(events, started), started.authorId)),
      ],
      {
        examples: [
          [[Array.of(datasetReviewWasStarted), authorId]], // only a DatasetReviewWasStarted
          [[Array.make(datasetReviewWasStarted, publicationOfDatasetReviewWasRequested), authorId]], // multiple events
          [[Array.make(datasetReviewWasStarted2, datasetReviewWasStarted), authorId]], // multiple DatasetReviewWasStarted events
        ],
      },
    )('returns the review', ([events, expected]) => {
      const actual = _.GetAuthor(events)

      expect(actual).toStrictEqual(Either.right(expected))
    })
  })

  describe("when the dataset review hasn't been started", () => {
    test.prop([fc.array(fc.datasetReviewEvent().filter(event => event._tag !== 'DatasetReviewWasStarted'))], {
      examples: [
        [Array.empty()], // no events
        [Array.make(publicationOfDatasetReviewWasRequested, datasetReviewWasPublished)], // no DatasetReviewWasStarted
      ],
    })('returns an error', events => {
      const actual = _.GetAuthor(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
    })
  })
})
