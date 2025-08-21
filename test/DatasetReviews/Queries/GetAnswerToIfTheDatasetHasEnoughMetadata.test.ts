import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetAnswerToIfTheDatasetHasEnoughMetadata.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetHasEnoughMetadata = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'yes',
  datasetReviewId,
})
const answeredIfTheDatasetHasEnoughMetadata2 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'no',
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetAnswerToIfTheDatasetHasEnoughMetadata', () => {
  describe('when the question has been answered', () => {
    test.prop(
      [
        fc
          .tuple(fc.array(fc.datasetReviewEvent()), fc.datasetReviewAnsweredIfTheDatasetHasEnoughMetadata())
          .map(([events, answered]) => Tuple.make(Array.append(events, answered), answered.answer)),
      ],
      {
        examples: [
          [
            [
              Array.of(answeredIfTheDatasetHasEnoughMetadata), // only an AnsweredIfTheDatasetHasEnoughMetadata
              answeredIfTheDatasetHasEnoughMetadata.answer,
            ],
          ],
          [
            [
              Array.make(
                // multiple events
                datasetReviewWasStarted,
                answeredIfTheDatasetHasEnoughMetadata,
                publicationOfDatasetReviewWasRequested,
              ),
              answeredIfTheDatasetHasEnoughMetadata.answer,
            ],
          ],
          [
            [
              Array.make(
                // multiple AnsweredIfTheDatasetHasEnoughMetadata events
                answeredIfTheDatasetHasEnoughMetadata,
                answeredIfTheDatasetHasEnoughMetadata2,
              ),
              answeredIfTheDatasetHasEnoughMetadata2.answer,
            ],
          ],
        ],
      },
    )('returns the answer', ([events, expected]) => {
      const actual = _.GetAnswerToIfTheDatasetHasEnoughMetadata(events)

      expect(actual).toStrictEqual(Option.some(expected))
    })
  })

  describe("when the dataset review hasn't been answered", () => {
    test.prop(
      [fc.array(fc.datasetReviewEvent().filter(event => event._tag !== 'AnsweredIfTheDatasetHasEnoughMetadata'))],
      {
        examples: [
          [Array.empty()], // no events
          [Array.make(datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished)], // no AnsweredIfTheDatasetHasEnoughMetadata
        ],
      },
    )('returns nothing', events => {
      const actual = _.GetAnswerToIfTheDatasetHasEnoughMetadata(events)

      expect(actual).toStrictEqual(Option.none())
    })
  })
})
