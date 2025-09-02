import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetDataForZenodoRecord.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import type * as Zenodo from '../../../src/Zenodo/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset1 = new DatasetReviews.RatedTheQualityOfTheDataset({ rating: 'fair', datasetReviewId })
const ratedTheQualityOfTheDataset2 = new DatasetReviews.RatedTheQualityOfTheDataset({ rating: 'poor', datasetReviewId })
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
  answer: 'yes',
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch1 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'partly',
    datasetReviewId,
  })
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch2 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'unsure',
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
const zenodoRecordForDatasetReviewWasCreated = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({
  recordId: 123,
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetDataForZenodoRecord', () => {
  describe('when it is ready to have a Zenodo record', () => {
    it.prop(
      [
        fc
          .uuid()
          .chain(datasetReviewId =>
            fc.tuple(
              fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.ratedTheQualityOfTheDataset({ datasetReviewId: fc.constant(datasetReviewId) }),
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
              fc.publicationOfDatasetReviewWasRequested({ datasetReviewId: fc.constant(datasetReviewId) }),
            ),
          )
          .map(events =>
            Tuple.make<[ReadonlyArray<DatasetReviews.DatasetReviewEvent>, Zenodo.DatasetReview]>(events, {
              qualityRating: Option.some(events[1].rating),
              answerToIfTheDatasetFollowsFairAndCarePrinciples: events[2].answer,
              answerToIfTheDatasetHasEnoughMetadata: Option.some(events[3].answer),
              answerToIfTheDatasetHasTrackedChanges: Option.some(events[4].answer),
              answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(events[5].answer),
              answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some(events[6].answer),
              answerToIfTheDatasetSupportsRelatedConclusions: Option.some(events[7].answer),
            }),
          ),
      ],
      {
        examples: [
          [
            [
              [
                datasetReviewWasStarted,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                publicationOfDatasetReviewWasRequested,
              ],
              {
                qualityRating: Option.none(),
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                answerToIfTheDatasetHasTrackedChanges: Option.none(),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
                answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
                answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
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
                publicationOfDatasetReviewWasRequested,
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
              },
            ],
          ], // with multiple answers
          [
            [
              [
                datasetReviewWasStarted,
                publicationOfDatasetReviewWasRequested,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
              ],
              {
                qualityRating: Option.none(),
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                answerToIfTheDatasetHasTrackedChanges: Option.none(),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
                answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
                answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
              },
            ],
          ], // different order
          [
            [
              [
                datasetReviewWasStarted,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                publicationOfDatasetReviewWasRequested,
                zenodoRecordForDatasetReviewWasCreated,
              ],
              {
                qualityRating: Option.none(),
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                answerToIfTheDatasetHasTrackedChanges: Option.none(),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
                answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
                answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
              },
            ],
          ], // already has a record
        ],
      },
    )('returns the preview', ([events, expected]) => {
      const actual = _.GetDataForZenodoRecord(events)

      expect(actual).toStrictEqual(Either.right(expected))
    })
  })

  describe('when it is not ready to be published', () => {
    it.prop(
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      {
        examples: [[[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested]]],
      },
    )('returns an error', events => {
      const actual = _.GetDataForZenodoRecord(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
    })
  })

  describe('when it is in progress', () => {
    it.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
      examples: [
        [[datasetReviewWasStarted]], // was started
        [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // also answered
      ],
    })('returns an error', events => {
      const actual = _.GetDataForZenodoRecord(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsInProgress()))
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
      const actual = _.GetDataForZenodoRecord(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
    })
  })

  describe('when it has not been started', () => {
    it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
      examples: [
        [[]], // no events
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples, publicationOfDatasetReviewWasRequested]], // with events
      ],
    })('returns an error', events => {
      const actual = _.GetDataForZenodoRecord(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
    })
  })
})
