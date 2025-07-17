import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Option, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'yes', datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples2 =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({ datasetReviewId })

describe('GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples', () => {
  describe('when the question has been answered', () => {
    test.prop(
      [
        fc
          .tuple(fc.array(fc.datasetReviewEvent()), fc.datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples())
          .map(([events, answered]) => Tuple.make(Array.append(events, answered), answered.answer)),
      ],
      {
        examples: [
          [
            [
              Array.of(answeredIfTheDatasetFollowsFairAndCarePrinciples), // only an AnsweredIfTheDatasetFollowsFairAndCarePrinciples
              answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
            ],
          ],
          [
            [
              Array.make(
                // multiple events
                datasetReviewWasStarted,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                publicationOfDatasetReviewWasRequested,
              ),
              answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
            ],
          ],
          [
            [
              Array.make(
                // multiple AnsweredIfTheDatasetFollowsFairAndCarePrinciples events
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                answeredIfTheDatasetFollowsFairAndCarePrinciples2,
              ),
              answeredIfTheDatasetFollowsFairAndCarePrinciples2.answer,
            ],
          ],
        ],
      },
    )('returns the answer', ([events, expected]) => {
      const actual = _.GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples(events)

      expect(actual).toStrictEqual(Option.some(expected))
    })
  })

  describe("when the dataset review hasn't been answered", () => {
    test.prop(
      [
        fc.array(
          fc.datasetReviewEvent().filter(event => event._tag !== 'AnsweredIfTheDatasetFollowsFairAndCarePrinciples'),
        ),
      ],
      {
        examples: [
          [Array.empty()], // no events
          [Array.make(datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished)], // no AnsweredIfTheDatasetFollowsFairAndCarePrinciples
        ],
      },
    )('returns nothing', events => {
      const actual = _.GetAnswerToIfTheDatasetFollowsFairAndCarePrinciples(events)

      expect(actual).toStrictEqual(Option.none())
    })
  })
})
