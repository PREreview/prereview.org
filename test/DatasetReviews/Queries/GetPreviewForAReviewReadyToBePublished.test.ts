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
            ),
          )
          .map(events =>
            Tuple.make(events as ReadonlyArray<DatasetReviews.DatasetReviewEvent>, {
              answerToIfTheDatasetFollowsFairAndCarePrinciples: events[1].answer,
              answerToIfTheDatasetHasEnoughMetadata: Option.some(events[2].answer),
              answerToIfTheDatasetHasTrackedChanges: Option.some(events[3].answer),
              answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(events[4].answer),
            }),
          ),
      ],
      {
        examples: [
          [
            [
              [datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples],
              {
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                answerToIfTheDatasetHasTrackedChanges: Option.none(),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
              },
            ],
          ], // with answer
          [
            [
              [
                datasetReviewWasStarted,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                answeredIfTheDatasetFollowsFairAndCarePrinciples2,
                answeredIfTheDatasetHasEnoughMetadata1,
                answeredIfTheDatasetHasEnoughMetadata2,
                answeredIfTheDatasetHasTrackedChanges1,
                answeredIfTheDatasetHasTrackedChanges2,
                answeredIfTheDatasetHasDataCensoredOrDeleted1,
                answeredIfTheDatasetHasDataCensoredOrDeleted2,
              ],
              {
                answerToIfTheDatasetFollowsFairAndCarePrinciples:
                  answeredIfTheDatasetFollowsFairAndCarePrinciples2.answer,
                answerToIfTheDatasetHasEnoughMetadata: Option.some(answeredIfTheDatasetHasEnoughMetadata2.answer),
                answerToIfTheDatasetHasTrackedChanges: Option.some(answeredIfTheDatasetHasTrackedChanges2.answer),
                answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(
                  answeredIfTheDatasetHasDataCensoredOrDeleted2.answer,
                ),
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
