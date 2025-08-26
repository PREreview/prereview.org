import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetAnswerToIfTheDatasetHasTrackedChanges.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetHasTrackedChanges = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'yes',
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges2 = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
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

describe('GetAnswerToIfTheDatasetHasTrackedChanges', () => {
  describe('when the question has been answered', () => {
    test.prop(
      [
        fc
          .tuple(fc.array(fc.datasetReviewEvent()), fc.datasetReviewAnsweredIfTheDatasetHasTrackedChanges())
          .map(([events, answered]) => Tuple.make(Array.append(events, answered), answered.answer)),
      ],
      {
        examples: [
          [
            [
              Array.of(answeredIfTheDatasetHasTrackedChanges), // only an AnsweredIfTheDatasetHasTrackedChanges
              answeredIfTheDatasetHasTrackedChanges.answer,
            ],
          ],
          [
            [
              Array.make(
                // multiple events
                datasetReviewWasStarted,
                answeredIfTheDatasetHasTrackedChanges,
                publicationOfDatasetReviewWasRequested,
              ),
              answeredIfTheDatasetHasTrackedChanges.answer,
            ],
          ],
          [
            [
              Array.make(
                // multiple AnsweredIfTheDatasetHasTrackedChanges events
                answeredIfTheDatasetHasTrackedChanges,
                answeredIfTheDatasetHasTrackedChanges2,
              ),
              answeredIfTheDatasetHasTrackedChanges2.answer,
            ],
          ],
        ],
      },
    )('returns the answer', ([events, expected]) => {
      const actual = _.GetAnswerToIfTheDatasetHasTrackedChanges(events)

      expect(actual).toStrictEqual(Option.some(expected))
    })
  })

  describe("when the question hasn't been answered", () => {
    test.prop(
      [fc.array(fc.datasetReviewEvent().filter(event => event._tag !== 'AnsweredIfTheDatasetHasTrackedChanges'))],
      {
        examples: [
          [Array.empty()], // no events
          [Array.make(datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished)], // no AnsweredIfTheDatasetHasTrackedChanges
        ],
      },
    )('returns nothing', events => {
      const actual = _.GetAnswerToIfTheDatasetHasTrackedChanges(events)

      expect(actual).toStrictEqual(Option.none())
    })
  })
})
