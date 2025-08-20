import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetPublishedReview.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples1 =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples2 =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'yes', datasetReviewId })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasAssignedADoi1 = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.1000/12345'),
  datasetReviewId,
})
const datasetReviewWasAssignedADoi2 = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.1000/67890'),
  datasetReviewId,
})
const datasetReviewWasPublished1 = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})
const datasetReviewWasPublished2 = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-02-03'),
})

describe('GetPublishedReview', () => {
  describe('when it has been published', () => {
    describe('when the data is available', () => {
      it.prop(
        [
          fc
            .tuple(
              fc.datasetReviewWasStarted(),
              fc.datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples(),
              fc.datasetReviewWasAssignedADoi(),
              fc.datasetReviewWasPublished(),
            )
            .map(events =>
              Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.PublishedReview]>(events, {
                author: {
                  name: 'A PREreviewer',
                  orcid: events[0].authorId,
                },
                doi: events[2].doi,
                id: events[0].datasetReviewId,
                questions: {
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: events[1].answer,
                  answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                },
                published: events[3].publicationDate,
              }),
            ),
        ],
        {
          examples: [
            [
              [
                [
                  datasetReviewWasStarted,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                  datasetReviewWasAssignedADoi1,
                  datasetReviewWasPublished1,
                ],
                {
                  author: {
                    name: 'A PREreviewer',
                    orcid: datasetReviewWasStarted.authorId,
                  },
                  doi: datasetReviewWasAssignedADoi1.doi,
                  id: datasetReviewId,
                  questions: {
                    answerToIfTheDatasetFollowsFairAndCarePrinciples:
                      answeredIfTheDatasetFollowsFairAndCarePrinciples1.answer,
                    answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                  },
                  published: datasetReviewWasPublished1.publicationDate,
                },
              ],
            ], // with one set of events
            [
              [
                [
                  datasetReviewWasStarted,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples2,
                  datasetReviewWasAssignedADoi1,
                  datasetReviewWasAssignedADoi2,
                  datasetReviewWasPublished1,
                  datasetReviewWasPublished2,
                ],
                {
                  author: {
                    name: 'A PREreviewer',
                    orcid: datasetReviewWasStarted.authorId,
                  },
                  doi: datasetReviewWasAssignedADoi2.doi,
                  id: datasetReviewId,
                  questions: {
                    answerToIfTheDatasetFollowsFairAndCarePrinciples:
                      answeredIfTheDatasetFollowsFairAndCarePrinciples2.answer,
                    answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                  },
                  published: datasetReviewWasPublished2.publicationDate,
                },
              ],
            ], // with multiple set of events
            [
              [
                [
                  datasetReviewWasPublished1,
                  datasetReviewWasAssignedADoi1,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                  datasetReviewWasStarted,
                ],
                {
                  author: {
                    name: 'A PREreviewer',
                    orcid: datasetReviewWasStarted.authorId,
                  },
                  doi: datasetReviewWasAssignedADoi1.doi,
                  id: datasetReviewId,
                  questions: {
                    answerToIfTheDatasetFollowsFairAndCarePrinciples:
                      answeredIfTheDatasetFollowsFairAndCarePrinciples1.answer,
                    answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                  },
                  published: datasetReviewWasPublished1.publicationDate,
                },
              ],
            ], // different order
          ],
        },
      )('returns the DOI', ([events, expected]) => {
        const actual = _.GetPublishedReview(events)

        expect(actual).toStrictEqual(Either.right(expected))
      })
    })

    describe("when the data isn't available", () => {
      it.prop(
        [
          fc
            .tuple(
              fc.datasetReviewWasStarted(),
              fc.datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples(),
              fc.datasetReviewWasPublished(),
            )
            .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
        ],
        {
          examples: [
            [[datasetReviewWasStarted, datasetReviewWasAssignedADoi1, datasetReviewWasPublished1]], // no AnsweredIfTheDatasetFollowsFairAndCarePrinciples
            [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished1]], // no DatasetReviewWasAssignedADoi
          ],
        },
      )('returns an error', events => {
        const actual = _.GetPublishedReview(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
      })
    })
  })

  describe('when it has not been published', () => {
    it.prop(
      [
        fc
          .nonEmptyArray(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasPublished'))))
          .filter(Array.some(Predicate.isTagged('DatasetReviewWasStarted'))),
      ],
      {
        examples: [
          [[datasetReviewWasStarted]], // was started
          [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples1]], // with answer
          [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested]], // publication was requested
        ],
      },
    )('returns an error', events => {
      const actual = _.GetPublishedReview(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})))
    })
  })

  describe('when it has not been started', () => {
    it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
      examples: [
        [[]], // no events
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished1]], // with events
      ],
    })('returns an error', events => {
      const actual = _.GetPublishedReview(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
    })
  })
})
