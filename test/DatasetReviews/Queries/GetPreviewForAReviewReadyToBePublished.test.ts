import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetPreviewForAReviewReadyToBePublished.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset1 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'excellent',
  detail: Option.none(),
  datasetReviewId,
})
const ratedTheQualityOfTheDataset2 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'fair',
  detail: Option.some(NonEmptyString.NonEmptyString('some detail')),
  datasetReviewId,
})
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
const answeredIfTheDatasetMattersToItsAudience1 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'unsure',
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience2 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'very-consequential',
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared1 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'unsure',
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
  answer: Option.some(NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')),
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
    competingInterests: Option.some(
      NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    ),
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
              fc.answeredIfTheDatasetMattersToItsAudience({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.answeredIfTheDatasetIsReadyToBeShared({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.answeredIfTheDatasetIsMissingAnything({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.personaForDatasetReviewWasChosen({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.competingInterestsForADatasetReviewWereDeclared({ datasetReviewId: fc.constant(datasetReviewId) }),
            ),
          )
          .map(events =>
            Tuple.make<[ReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.DatasetReviewPreview]>(events, {
              author: { orcidId: events[0].authorId, persona: Option.some(events[13].persona) },
              dataset: events[0].datasetId,
              competingInterests: events[14].competingInterests,
              qualityRating: Option.some(events[1].rating),
              answerToIfTheDatasetFollowsFairAndCarePrinciples: events[2].answer,
              answerToIfTheDatasetHasEnoughMetadata: Option.some(events[3].answer),
              answerToIfTheDatasetHasTrackedChanges: Option.some(events[4].answer),
              answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some(events[5].answer),
              answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some(events[6].answer),
              answerToIfTheDatasetSupportsRelatedConclusions: Option.some(events[7].answer),
              answerToIfTheDatasetIsDetailedEnough: Option.some(events[8].answer),
              answerToIfTheDatasetIsErrorFree: Option.some(events[9].answer),
              answerToIfTheDatasetMattersToItsAudience: Option.some(events[10].answer),
              answerToIfTheDatasetIsReadyToBeShared: Option.some(events[11].answer),
              answerToIfTheDatasetIsMissingAnything: Option.some(events[12].answer),
            }),
          ),
      ],
      {
        examples: [
          [
            [
              [datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples],
              {
                author: { orcidId: datasetReviewWasStarted.authorId, persona: Option.none() },
                dataset: datasetReviewWasStarted.datasetId,
                competingInterests: Option.none(),
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
                answerToIfTheDatasetMattersToItsAudience: Option.none(),
                answerToIfTheDatasetIsReadyToBeShared: Option.none(),
                answerToIfTheDatasetIsMissingAnything: Option.none(),
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
              ],
              {
                author: {
                  orcidId: datasetReviewWasStarted.authorId,
                  persona: Option.some(personaForDatasetReviewWasChosen2.persona),
                },
                dataset: datasetReviewWasStarted.datasetId,
                competingInterests: competingInterestsForADatasetReviewWereDeclared2.competingInterests,
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
                answerToIfTheDatasetMattersToItsAudience: Option.some(answeredIfTheDatasetMattersToItsAudience2.answer),
                answerToIfTheDatasetIsReadyToBeShared: Option.some(answeredIfTheDatasetIsReadyToBeShared2.answer),
                answerToIfTheDatasetIsMissingAnything: Option.some(answeredIfTheDatasetIsMissingAnything2.answer),
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
