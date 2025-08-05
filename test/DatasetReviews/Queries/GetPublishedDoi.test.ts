import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Either, identity, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetPublishedDoi.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
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
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({ datasetReviewId })

describe('GetPublishedDoi', () => {
  describe('when it has been published', () => {
    describe('when there is a DOI', () => {
      it.failing.prop(
        [
          fc
            .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasAssignedADoi(), fc.datasetReviewWasPublished())
            .map(events =>
              Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Doi.Doi]>(
                events,
                events[1].doi,
              ),
            ),
        ],
        {
          examples: [
            [
              [
                [
                  datasetReviewWasStarted,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  datasetReviewWasAssignedADoi1,
                  datasetReviewWasPublished,
                ],
                datasetReviewWasAssignedADoi1.doi,
              ],
            ], // was published
            [
              [
                [
                  datasetReviewWasStarted,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  datasetReviewWasAssignedADoi1,
                  datasetReviewWasAssignedADoi2,
                  datasetReviewWasPublished,
                ],
                datasetReviewWasAssignedADoi2.doi,
              ],
            ], // multiple DOIs
            [
              [
                [
                  datasetReviewWasStarted,
                  datasetReviewWasPublished,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  datasetReviewWasAssignedADoi1,
                ],
                datasetReviewWasAssignedADoi1.doi,
              ],
            ], // different order
          ],
        },
      )('returns the DOI', ([events, expected]) => {
        const actual = _.GetPublishedDoi(events)

        expect(actual).toStrictEqual(Either.right(expected))
      })
    })

    describe("when there isn't a DOI", () => {
      it.prop(
        [
          fc
            .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
            .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
        ],
        {
          examples: [
            [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // was published
            [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
            [[datasetReviewWasStarted, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
          ],
        },
      )('returns an error', events => {
        const actual = _.GetPublishedDoi(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
      })
    })
  })

  describe('when it is being published', () => {
    it.failing.prop(
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      {
        examples: [
          [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested]], // was requested
          [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasAssignedADoi1]], // assigned a DOI
          [
            [
              datasetReviewWasStarted,
              answeredIfTheDatasetFollowsFairAndCarePrinciples,
              publicationOfDatasetReviewWasRequested,
            ],
          ], // also answered
          [
            [
              datasetReviewWasStarted,
              publicationOfDatasetReviewWasRequested,
              answeredIfTheDatasetFollowsFairAndCarePrinciples,
            ],
          ], // different order
        ],
      },
    )('returns an error', events => {
      const actual = _.GetPublishedDoi(events)

      expect(actual).toStrictEqual(Either.void)
    })
  })

  describe('when it is in progress', () => {
    it.failing.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
      examples: [
        [[datasetReviewWasStarted]], // was started
        [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // with answer
      ],
    })('returns an error', events => {
      const actual = _.GetPublishedDoi(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsInProgress()))
    })
  })

  describe('when it has not been started', () => {
    it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
      examples: [
        [[]], // no events
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
      ],
    })('returns an error', events => {
      const actual = _.GetPublishedDoi(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
    })
  })
})
