import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfReviewIsInProgress.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
    answer: 'no',
    detail: Option.none(),
    datasetReviewId,
  })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('CheckIfReviewIsInProgress', () => {
  describe('when it is in progress', () => {
    it.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
      examples: [
        [[datasetReviewWasStarted]], // was started
        [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // with answer
      ],
    })('has been answered', events => {
      const actual = _.CheckIfReviewIsInProgress(events)

      expect(actual).toStrictEqual(Either.void)
    })
  })

  describe('when it has not been started', () => {
    it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
      examples: [
        [[]], // no events
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
      ],
    })('returns an error', events => {
      const actual = _.CheckIfReviewIsInProgress(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
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
      const actual = _.CheckIfReviewIsInProgress(events)

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
      const actual = _.CheckIfReviewIsInProgress(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
    })
  })
})
