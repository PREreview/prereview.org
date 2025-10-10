import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { type Array, identity, Option, Predicate } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetNextExpectedCommandForAUserOnADatasetReview.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset1 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'poor',
  detail: Option.none(),
  datasetReviewId,
})
const ratedTheQualityOfTheDataset2 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'fair',
  detail: NonEmptyString.fromString('some detail'),
  datasetReviewId,
})
const answeredIfTheDatasetFollowsFairAndCarePrinciples1 =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
    answer: 'no',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetFollowsFairAndCarePrinciples2 =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
    answer: 'yes',
    detail: NonEmptyString.fromString('Some detail about yes'),
    datasetReviewId,
  })
const answeredIfTheDatasetHasEnoughMetadata1 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasEnoughMetadata2 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges1 = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges2 = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted1 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'partly',
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted2 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'unsure',
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch1 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'unsure',
    datasetReviewId,
  })
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch2 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'no',
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions1 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'no',
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions2 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'yes',
    datasetReviewId,
  })
const answeredIfTheDatasetIsDetailedEnough1 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'partly',
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
  answer: 'partly',
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience1 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'unsure',
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience2 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'not-consequential',
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared1 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'yes',
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared2 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'no',
  datasetReviewId,
})
const answeredIfTheDatasetIsMissingAnything1 = new DatasetReviews.AnsweredIfTheDatasetIsMissingAnything({
  answer: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsMissingAnything2 = new DatasetReviews.AnsweredIfTheDatasetIsMissingAnything({
  answer: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
  datasetReviewId,
})
const personaForDatasetReviewWasChosen1 = new DatasetReviews.PersonaForDatasetReviewWasChosen({
  persona: 'public',
  datasetReviewId,
})
const personaForDatasetReviewWasChosen2 = new DatasetReviews.PersonaForDatasetReviewWasChosen({
  persona: 'pseudonym',
  datasetReviewId,
})
const competingInterestsForADatasetReviewWereDeclared1 =
  new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
    competingInterests: Option.none(),
    datasetReviewId,
  })
const competingInterestsForADatasetReviewWereDeclared2 =
  new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
    competingInterests: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    datasetReviewId,
  })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetNextExpectedCommandForAUserOnADatasetReview', () => {
  describe('when it has not been started', () => {
    it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
      examples: [
        [[]], // no events
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished]], // with events
      ],
    })('returns nothing to do', events => {
      const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

      expect(actual).toStrictEqual(Option.none())
    })
  })

  describe('when it is in progress', () => {
    it.prop(
      [
        fc
          .tuple(
            fc.datasetReviewWasStarted(),
            fc.ratedTheQualityOfTheDataset(),
            fc.answeredIfTheDatasetFollowsFairAndCarePrinciples(),
            fc.answeredIfTheDatasetHasEnoughMetadata(),
            fc.answeredIfTheDatasetHasTrackedChanges(),
            fc.answeredIfTheDatasetHasDataCensoredOrDeleted(),
            fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch(),
            fc.answeredIfTheDatasetSupportsRelatedConclusions(),
            fc.answeredIfTheDatasetIsDetailedEnough(),
            fc.answeredIfTheDatasetIsErrorFree(),
            fc.answeredIfTheDatasetMattersToItsAudience(),
            fc.answeredIfTheDatasetIsReadyToBeShared(),
            fc.answeredIfTheDatasetIsMissingAnything(),
            fc.personaForDatasetReviewWasChosen(),
            fc.competingInterestsForADatasetReviewWereDeclared(),
          )
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
        fc.constant<_.NextExpectedCommand>('PublishDatasetReview'),
      ],
      {
        examples: [
          [[datasetReviewWasStarted], 'RateTheQuality'], // was started
          [[datasetReviewWasStarted, ratedTheQualityOfTheDataset1], 'AnswerIfTheDatasetFollowsFairAndCarePrinciples'], // 1 question answered
          [
            [datasetReviewWasStarted, ratedTheQualityOfTheDataset1, answeredIfTheDatasetFollowsFairAndCarePrinciples1],
            'AnswerIfTheDatasetHasEnoughMetadata',
          ], // 2 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
            ],
            'AnswerIfTheDatasetHasTrackedChanges',
          ], // 3 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
            ],
            'AnswerIfTheDatasetHasDataCensoredOrDeleted',
          ], // 4 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
            ],
            'AnswerIfTheDatasetIsAppropriateForThisKindOfResearch',
          ], // 5 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
            ],
            'AnswerIfTheDatasetSupportsRelatedConclusions',
          ], // 6 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
            ],
            'AnswerIfTheDatasetIsDetailedEnough',
          ], // 7 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
            ],
            'AnswerIfTheDatasetIsErrorFree',
          ], // 8 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
              answeredIfTheDatasetIsErrorFree1,
            ],
            'AnswerIfTheDatasetMattersToItsAudience',
          ], // 9 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
              answeredIfTheDatasetIsErrorFree1,
              answeredIfTheDatasetMattersToItsAudience1,
            ],
            'AnswerIfTheDatasetIsReadyToBeShared',
          ], // 10 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
              answeredIfTheDatasetIsErrorFree1,
              answeredIfTheDatasetMattersToItsAudience1,
              answeredIfTheDatasetIsReadyToBeShared1,
            ],
            'AnswerIfTheDatasetIsMissingAnything',
          ], // 11 questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
              answeredIfTheDatasetIsErrorFree1,
              answeredIfTheDatasetMattersToItsAudience1,
              answeredIfTheDatasetIsReadyToBeShared1,
              answeredIfTheDatasetIsMissingAnything1,
            ],
            'ChoosePersona',
          ], // all questions answered
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
              answeredIfTheDatasetIsErrorFree1,
              answeredIfTheDatasetMattersToItsAudience1,
              answeredIfTheDatasetIsReadyToBeShared1,
              answeredIfTheDatasetIsMissingAnything1,
              personaForDatasetReviewWasChosen1,
            ],
            'DeclareCompetingInterests',
          ], // persona chosen
          [
            [
              datasetReviewWasStarted,
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsDetailedEnough1,
              answeredIfTheDatasetIsErrorFree1,
              answeredIfTheDatasetMattersToItsAudience1,
              answeredIfTheDatasetIsReadyToBeShared1,
              answeredIfTheDatasetIsMissingAnything1,
              personaForDatasetReviewWasChosen1,
              competingInterestsForADatasetReviewWereDeclared1,
            ],
            'PublishDatasetReview',
          ], // competing interests declared
          [
            [
              datasetReviewWasStarted,
              competingInterestsForADatasetReviewWereDeclared1,
              answeredIfTheDatasetIsMissingAnything1,
              answeredIfTheDatasetIsReadyToBeShared1,
              answeredIfTheDatasetMattersToItsAudience1,
              answeredIfTheDatasetIsErrorFree1,
              answeredIfTheDatasetSupportsRelatedConclusions1,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
              answeredIfTheDatasetHasDataCensoredOrDeleted1,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetIsDetailedEnough1,
              ratedTheQualityOfTheDataset1,
              personaForDatasetReviewWasChosen1,
              competingInterestsForADatasetReviewWereDeclared2,
              answeredIfTheDatasetIsMissingAnything2,
              answeredIfTheDatasetIsReadyToBeShared2,
              answeredIfTheDatasetMattersToItsAudience2,
              answeredIfTheDatasetIsErrorFree2,
              answeredIfTheDatasetSupportsRelatedConclusions2,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch2,
              answeredIfTheDatasetHasDataCensoredOrDeleted2,
              answeredIfTheDatasetHasTrackedChanges2,
              answeredIfTheDatasetHasEnoughMetadata2,
              answeredIfTheDatasetFollowsFairAndCarePrinciples2,
              answeredIfTheDatasetIsDetailedEnough2,
              ratedTheQualityOfTheDataset2,
              personaForDatasetReviewWasChosen2,
            ],
            'PublishDatasetReview',
          ], // different order
        ],
      },
    )('returns the next expected command', (events, expected) => {
      const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

      expect(actual).toStrictEqual(Option.some(expected))
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
              ratedTheQualityOfTheDataset1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetHasTrackedChanges1,
              publicationOfDatasetReviewWasRequested,
            ],
          ], // also answered
          [
            [
              datasetReviewWasStarted,
              publicationOfDatasetReviewWasRequested,
              answeredIfTheDatasetHasTrackedChanges1,
              answeredIfTheDatasetHasEnoughMetadata1,
              answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              ratedTheQualityOfTheDataset1,
            ],
          ], // different order
        ],
      },
    )('returns nothing to do', events => {
      const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

      expect(actual).toStrictEqual(Option.none())
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
          [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished]], // was published
          [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
          [[datasetReviewWasStarted, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples1]], // different order
        ],
      },
    )('returns nothing to do', events => {
      const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

      expect(actual).toStrictEqual(Option.none())
    })
  })
})
