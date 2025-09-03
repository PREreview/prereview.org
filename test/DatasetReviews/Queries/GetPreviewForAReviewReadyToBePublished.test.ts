import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetPreviewForAReviewReadyToBePublished.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset1 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'excellent',
  datasetReviewId,
})
const ratedTheQualityOfTheDataset2 = new DatasetReviews.RatedTheQualityOfTheDataset({ rating: 'fair', datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples2 =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'yes', datasetReviewId })
const answeredIfTheDatasetHasEnoughMetadata1 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'no',
  datasetReviewId,
})
const answeredIfTheDatasetHasEnoughMetadata2 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'yes',
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges1 = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'partly',
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges2 = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'unsure',
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted1 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'no',
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted2 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'partly',
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch1 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'unsure',
    datasetReviewId,
  })
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch2 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'yes',
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions1 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'yes',
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions2 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'no',
    datasetReviewId,
  })
const answeredIfTheDatasetIsDetailedEnough1 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'unsure',
  datasetReviewId,
})
const answeredIfTheDatasetIsDetailedEnough2 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'yes',
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree1 = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'no',
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree2 = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'yes',
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetPreviewForAReviewReadyToBePublished', () => {
  describe('when it is ready to be published', () => {
    it.prop(
      [
        fc
          .uuid()
          .chain(datasetReviewId =>
            fc.tuple(
              fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.ratedTheQualityOfTheDataset({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
              fc.answeredIfTheDatasetFollowsFairAndCarePrinciples({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
              fc.answeredIfTheDatasetHasEnoughMetadata({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
              fc.answeredIfTheDatasetHasTrackedChanges({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
              fc.answeredIfTheDatasetHasDataCensoredOrDeleted({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
              fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
              fc.answeredIfTheDatasetSupportsRelatedConclusions({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.answeredIfTheDatasetIsDetailedEnough({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.answeredIfTheDatasetIsErrorFree({ datasetReviewId: fc.constant(datasetReviewId) }),
            ),
          )
          .map(events =>
            Tuple.make<[ReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.DatasetReviewPreview]>(events, {
              qualityRating: Option.some(events[1].rating),
              answerToIfTheDatasetFollowsFairAndCarePrinciples: events[2].answer,
              answerToIfTheDatasetHasEnoughMetadata: Option.some(events[3].answer),
              answerToIfTheDatasetHasTrackedChanges: Option.some(events[4].answer),
              answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(events[5].answer),
              answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some(events[6].answer),
              answerToIfTheDatasetSupportsRelatedConclusions: Option.some(events[7].answer),
              answerToIfTheDatasetIsDetailedEnough: Option.some(events[8].answer),
              answerToIfTheDatasetIsErrorFree: Option.some(events[9].answer),
            }),
          ),
      ],
      {
        examples: [
          [
            [
              [datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples],
              {
                qualityRating: Option.none(),
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                answerToIfTheDatasetHasTrackedChanges: Option.none(),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
                answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
                answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
                answerToIfTheDatasetIsDetailedEnough: Option.none(),
                answerToIfTheDatasetIsErrorFree: Option.none(),
              },
            ],
          ], // with answer
          [
            [
              [
                datasetReviewWasStarted,
                ratedTheQualityOfTheDataset1,
                ratedTheQualityOfTheDataset2,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                answeredIfTheDatasetFollowsFairAndCarePrinciples2,
                answeredIfTheDatasetHasEnoughMetadata1,
                answeredIfTheDatasetHasEnoughMetadata2,
                answeredIfTheDatasetHasTrackedChanges1,
                answeredIfTheDatasetHasTrackedChanges2,
                answeredIfTheDatasetHasDataCensoredOrDeleted1,
                answeredIfTheDatasetHasDataCensoredOrDeleted2,
                answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                answeredIfTheDatasetIsAppropriateForThisKindOfResearch2,
                answeredIfTheDatasetSupportsRelatedConclusions1,
                answeredIfTheDatasetSupportsRelatedConclusions2,
                answeredIfTheDatasetIsDetailedEnough1,
                answeredIfTheDatasetIsDetailedEnough2,
                answeredIfTheDatasetIsErrorFree1,
                answeredIfTheDatasetIsErrorFree2,
              ],
              {
                qualityRating: Option.some(ratedTheQualityOfTheDataset2.rating),
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples2.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.some(answeredIfTheDatasetHasEnoughMetadata2.answer),
                answerToIfTheDatasetHasTrackedChanges: Option.some(answeredIfTheDatasetHasTrackedChanges2.answer),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(
                  answeredIfTheDatasetHasDataCensoredOrDeleted2.answer,
                ),
                answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some(
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch2.answer,
                ),
                answerToIfTheDatasetSupportsRelatedConclusions: Option.some(
                  answeredIfTheDatasetSupportsRelatedConclusions2.answer,
                ),
                answerToIfTheDatasetIsDetailedEnough: Option.some(answeredIfTheDatasetIsDetailedEnough2.answer),
                answerToIfTheDatasetIsErrorFree: Option.some(answeredIfTheDatasetIsErrorFree2.answer),
              },
            ],
          ], // with multiple answers
        ],
      },
    )('returns the preview', ([events, expected]) => {
      const actual = _.GetPreviewForAReviewReadyToBePublished(events)

      expect(actual).toStrictEqual(Either.right(expected))
    })
  })

  describe('when it is not ready to be published', () => {
    it.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
      examples: [
        [[datasetReviewWasStarted]], // was started
      ],
    })('returns an error', events => {
      const actual = _.GetPreviewForAReviewReadyToBePublished(events)

      expect(actual).toStrictEqual(
        Either.left(
          new DatasetReviews.DatasetReviewNotReadyToBePublished({
            missing: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
          }),
        ),
      )
    })
  })

  describe('when it is being published', () => {
    it.prop(
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      {
        examples: [
          [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested]], // was requested
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
      const actual = _.GetPreviewForAReviewReadyToBePublished(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
    })
  })

  describe('when it has been published', () => {
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
      const actual = _.GetPreviewForAReviewReadyToBePublished(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
    })
  })

  describe('when it has not been started', () => {
    it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
      examples: [
        [[]], // no events
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
      ],
    })('returns an error', events => {
      const actual = _.GetPreviewForAReviewReadyToBePublished(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
    })
  })
})
