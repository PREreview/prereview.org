import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/GetPublishedReview.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset1 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'fair',
  detail: Option.none(),
  datasetReviewId,
})
const ratedTheQualityOfTheDataset2 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'excellent',
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
  answer: 'partly',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges2 = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'unsure',
  detail: NonEmptyString.fromString('Some detail about unsure'),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted1 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'unsure',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted2 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'no',
  detail: NonEmptyString.fromString('Some detail about no'),
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch1 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'yes',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch2 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'partly',
    detail: NonEmptyString.fromString('Some detail about partly'),
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusion1 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'no',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusion2 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'yes',
    detail: NonEmptyString.fromString('Some detail about yes'),
    datasetReviewId,
  })
const answeredIfTheDatasetIsDetailedEnough1 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'partly',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsDetailedEnough2 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'unsure',
  detail: NonEmptyString.fromString('Some detail about unsure'),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree1 = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'yes',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree2 = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'no',
  detail: NonEmptyString.fromString('Some detail about no'),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience1 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'not-consequential',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience2 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'very-consequential',
  detail: NonEmptyString.fromString('Some detail about very-consequential'),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared1 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared2 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'unsure',
  detail: NonEmptyString.fromString('Some detail about unsure'),
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
              fc.answeredIfTheDatasetFollowsFairAndCarePrinciples(),
              fc.personaForDatasetReviewWasChosen(),
              fc.datasetReviewWasAssignedADoi(),
              fc.datasetReviewWasPublished(),
            )
            .map(events =>
              Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.PublishedReview]>(events, {
                author: { orcidId: events[0].authorId, persona: events[2].persona },
                dataset: events[0].datasetId,
                doi: events[3].doi,
                id: events[0].datasetReviewId,
                questions: {
                  qualityRating: Option.none(),
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: events[1].answer,
                    detail: events[1].detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                  answerToIfTheDatasetHasTrackedChanges: Option.none(),
                  answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
                  answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
                  answerToIfTheDatasetIsDetailedEnough: Option.none(),
                  answerToIfTheDatasetIsErrorFree: Option.none(),
                  answerToIfTheDatasetMattersToItsAudience: Option.none(),
                  answerToIfTheDatasetIsReadyToBeShared: Option.none(),
                  answerToIfTheDatasetIsMissingAnything: Option.none(),
                },
                competingInterests: Option.none(),
                published: events[4].publicationDate,
              }),
            ),
        ],
        {
          examples: [
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusion1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  datasetReviewWasAssignedADoi1,
                  datasetReviewWasPublished1,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: personaForDatasetReviewWasChosen1.persona,
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  doi: datasetReviewWasAssignedADoi1.doi,
                  id: datasetReviewId,
                  questions: {
                    qualityRating: Option.some({
                      rating: ratedTheQualityOfTheDataset1.rating,
                      detail: ratedTheQualityOfTheDataset1.detail,
                    }),
                    answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                      answer: answeredIfTheDatasetFollowsFairAndCarePrinciples1.answer,
                      detail: answeredIfTheDatasetFollowsFairAndCarePrinciples1.detail,
                    },
                    answerToIfTheDatasetHasEnoughMetadata: Option.some({
                      answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                      detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                    }),
                    answerToIfTheDatasetHasTrackedChanges: Option.some({
                      answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                      detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                    }),
                    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(
                      answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    ),
                    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some(
                      answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    ),
                    answerToIfTheDatasetSupportsRelatedConclusions: Option.some(
                      answeredIfTheDatasetSupportsRelatedConclusion1.answer,
                    ),
                    answerToIfTheDatasetIsDetailedEnough: Option.some(answeredIfTheDatasetIsDetailedEnough1.answer),
                    answerToIfTheDatasetIsErrorFree: Option.some(answeredIfTheDatasetIsErrorFree1.answer),
                    answerToIfTheDatasetMattersToItsAudience: Option.some(
                      answeredIfTheDatasetMattersToItsAudience1.answer,
                    ),
                    answerToIfTheDatasetIsReadyToBeShared: Option.some(answeredIfTheDatasetIsReadyToBeShared1.answer),
                    answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  },
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  published: datasetReviewWasPublished1.publicationDate,
                },
              ],
            ], // with one set of events
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  ratedTheQualityOfTheDataset2,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples2,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasEnoughMetadata2,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasTrackedChanges2,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted2,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch2,
                  answeredIfTheDatasetSupportsRelatedConclusion1,
                  answeredIfTheDatasetSupportsRelatedConclusion2,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetIsDetailedEnough2,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsErrorFree2,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetMattersToItsAudience2,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsReadyToBeShared2,
                  answeredIfTheDatasetIsMissingAnything1,
                  answeredIfTheDatasetIsMissingAnything2,
                  personaForDatasetReviewWasChosen1,
                  personaForDatasetReviewWasChosen2,
                  competingInterestsForADatasetReviewWereDeclared1,
                  competingInterestsForADatasetReviewWereDeclared2,
                  datasetReviewWasAssignedADoi1,
                  datasetReviewWasAssignedADoi2,
                  datasetReviewWasPublished1,
                  datasetReviewWasPublished2,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: personaForDatasetReviewWasChosen2.persona,
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  doi: datasetReviewWasAssignedADoi2.doi,
                  id: datasetReviewId,
                  questions: {
                    qualityRating: Option.some({
                      rating: ratedTheQualityOfTheDataset2.rating,
                      detail: ratedTheQualityOfTheDataset2.detail,
                    }),
                    answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                      answer: answeredIfTheDatasetFollowsFairAndCarePrinciples2.answer,
                      detail: answeredIfTheDatasetFollowsFairAndCarePrinciples2.detail,
                    },
                    answerToIfTheDatasetHasEnoughMetadata: Option.some({
                      answer: answeredIfTheDatasetHasEnoughMetadata2.answer,
                      detail: answeredIfTheDatasetHasEnoughMetadata2.detail,
                    }),
                    answerToIfTheDatasetHasTrackedChanges: Option.some({
                      answer: answeredIfTheDatasetHasTrackedChanges2.answer,
                      detail: answeredIfTheDatasetHasTrackedChanges2.detail,
                    }),
                    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(
                      answeredIfTheDatasetHasDataCensoredOrDeleted2.answer,
                    ),
                    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some(
                      answeredIfTheDatasetIsAppropriateForThisKindOfResearch2.answer,
                    ),
                    answerToIfTheDatasetSupportsRelatedConclusions: Option.some(
                      answeredIfTheDatasetSupportsRelatedConclusion2.answer,
                    ),
                    answerToIfTheDatasetIsDetailedEnough: Option.some(answeredIfTheDatasetIsDetailedEnough2.answer),
                    answerToIfTheDatasetIsErrorFree: Option.some(answeredIfTheDatasetIsErrorFree2.answer),
                    answerToIfTheDatasetMattersToItsAudience: Option.some(
                      answeredIfTheDatasetMattersToItsAudience2.answer,
                    ),
                    answerToIfTheDatasetIsReadyToBeShared: Option.some(answeredIfTheDatasetIsReadyToBeShared2.answer),
                    answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything2.answer,
                  },
                  competingInterests: competingInterestsForADatasetReviewWereDeclared2.competingInterests,
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
                  author: { orcidId: datasetReviewWasStarted.authorId, persona: 'public' },
                  dataset: datasetReviewWasStarted.datasetId,
                  doi: datasetReviewWasAssignedADoi1.doi,
                  id: datasetReviewId,
                  questions: {
                    qualityRating: Option.none(),
                    answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                      answer: answeredIfTheDatasetFollowsFairAndCarePrinciples1.answer,
                      detail: answeredIfTheDatasetFollowsFairAndCarePrinciples1.detail,
                    },
                    answerToIfTheDatasetHasEnoughMetadata: Option.none(),
                    answerToIfTheDatasetHasTrackedChanges: Option.none(),
                    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
                    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
                    answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
                    answerToIfTheDatasetIsDetailedEnough: Option.none(),
                    answerToIfTheDatasetIsErrorFree: Option.none(),
                    answerToIfTheDatasetMattersToItsAudience: Option.none(),
                    answerToIfTheDatasetIsReadyToBeShared: Option.none(),
                    answerToIfTheDatasetIsMissingAnything: Option.none(),
                  },
                  competingInterests: Option.none(),
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
              fc.answeredIfTheDatasetFollowsFairAndCarePrinciples(),
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
