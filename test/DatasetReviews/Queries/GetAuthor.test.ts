import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Either, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetAuthor.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const authorId = Orcid.Orcid('0000-0002-1825-0097')
const authorId2 = Orcid.Orcid('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId })
const datasetReviewWasStarted2 = new DatasetReviews.DatasetReviewWasStarted({ authorId: authorId2, datasetId })
const publicationWasRequested = new DatasetReviews.PublicationWasRequested()
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished()

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
          [[Array.make(datasetReviewWasStarted, publicationWasRequested), authorId]], // multiple events
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
        [Array.make(publicationWasRequested, datasetReviewWasPublished)], // no DatasetReviewWasStarted
      ],
    })('returns an error', events => {
      const actual = _.GetAuthor(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnableToQuery({})))
    })
  })
})
