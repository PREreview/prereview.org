import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetPreviewForAReviewReadyToBePublished.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Queries from '../../../src/Queries.ts'
import { Doi, EmailAddress, Name, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
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
  detail: NonEmptyString.fromString('some detail'),
  datasetReviewId,
})
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
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
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted2 = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'partly',
  detail: NonEmptyString.fromString('Some detail about partly'),
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch1 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'unsure',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch2 =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'yes',
    detail: NonEmptyString.fromString('Some detail about yes'),
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions1 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'yes',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions2 =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'no',
    detail: NonEmptyString.fromString('Some detail about no'),
    datasetReviewId,
  })
const answeredIfTheDatasetIsDetailedEnough1 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'unsure',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsDetailedEnough2 = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree1 = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree2 = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience1 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'unsure',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience2 = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'very-consequential',
  detail: NonEmptyString.fromString('Some detail about very-consequential'),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared1 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'unsure',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared2 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'no',
  detail: NonEmptyString.fromString('Some detail about no'),
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
const othersNeedToBeListedYes = new DatasetReviews.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId,
})
const othersNeedToBeListedNo = new DatasetReviews.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'no',
  datasetReviewId,
})
const invited1 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('c4342f49-62f7-496f-9ce9-2c18e32a5cef'),
  contactDetails: Option.some({
    name: Name.Name('Josiah Carberry'),
    emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
  }),
})
const invited2 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('e9aaf38b-2d3b-4703-a16a-6c1408762ab7'),
  contactDetails: Option.some({
    name: Name.Name('Arne Saknussemm'),
    emailAddress: EmailAddress.EmailAddress('asaknussemm@example.com'),
  }),
})
const invited3 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('bf962433-30c0-415f-ae8f-faeca117b9e1'),
  contactDetails: Option.none(),
})
const removed = new DatasetReviews.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('c4342f49-62f7-496f-9ce9-2c18e32a5cef'),
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
const declaredIfAiWasUsedToGenerateNewIdeasYes =
  new DatasetReviews.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
    generativeAiIdeas: { answer: 'yes', detail: NonEmptyString.fromString('Some detail about yes') },
    datasetReviewId,
  })
const declaredIfAiWasUsedToGenerateNewIdeasNo =
  new DatasetReviews.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
    generativeAiIdeas: { answer: 'no' },
    datasetReviewId,
  })
const declaredThatTheCodeOfConductWasFollowedForADatasetReview =
  new DatasetReviews.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant(),
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
      'returns the preview',
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
              fc
                .declaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
                  datasetReviewId: fc.constant(datasetReviewId),
                })
                .filter(event => event.generativeAiIdeas.answer === 'no'),
              fc.declaredThatTheCodeOfConductWasFollowedForADatasetReview({
                datasetReviewId: fc.constant(datasetReviewId),
              }),
            ),
          )
          .map(events =>
            Tuple.make<[ReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.DatasetReviewPreview]>(events, {
              author: { orcidId: events[0].authorId, persona: Option.some(events[13].persona) },
              dataset: events[0].datasetId,
              competingInterests: events[14].competingInterests,
              qualityRating: { rating: events[1].rating, detail: events[1].detail },
              answerToIfTheDatasetFollowsFairAndCarePrinciples: { answer: events[2].answer, detail: events[2].detail },
              answerToIfTheDatasetHasEnoughMetadata: {
                answer: events[3].answer,
                detail: events[3].detail,
              },
              answerToIfTheDatasetHasTrackedChanges: {
                answer: events[4].answer,
                detail: events[4].detail,
              },
              answerToIfTheDatasetHasDataCensoredOrDeleted: {
                answer: events[5].answer,
                detail: events[5].detail,
              },
              answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                answer: events[6].answer,
                detail: events[6].detail,
              },
              answerToIfTheDatasetSupportsRelatedConclusions: {
                answer: events[7].answer,
                detail: events[7].detail,
              },
              answerToIfTheDatasetIsDetailedEnough: {
                answer: events[8].answer,
                detail: events[8].detail,
              },
              answerToIfTheDatasetIsErrorFree: {
                answer: events[9].answer,
                detail: events[9].detail,
              },
              answerToIfTheDatasetMattersToItsAudience: {
                answer: events[10].answer,
                detail: events[10].detail,
              },
              answerToIfTheDatasetIsReadyToBeShared: {
                answer: events[11].answer,
                detail: events[11].detail,
              },
              answerToIfTheDatasetIsMissingAnything: events[12].answer,
              generativeAiIdeas: events[15].generativeAiIdeas,
              license: 'CC-BY-4.0',
            }),
          ),
      ],
      ([[events, expected]]) => {
        const actual = _.GetPreviewForAReviewReadyToBePublished(events)

        expect(actual).toStrictEqual(Either.right(expected))
      },
      {
        fastCheck: {
          examples: [
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // with answer
            [
              [
                [
                  datasetReviewWasStarted,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
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
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen2.persona),
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared2.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset2.rating,
                    detail: ratedTheQualityOfTheDataset2.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples2.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples2.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata2.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata2.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges2.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges2.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted2.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted2.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch2.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch2.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions2.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions2.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough2.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough2.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree2.answer,
                    detail: answeredIfTheDatasetIsErrorFree2.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience2.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience2.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared2.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared2.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything2.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // with multiple answers
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  othersNeedToBeListedYes,
                  invited1,
                  invited2,
                  invited3,
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  authorsToInvite: Option.some(
                    Array.make(
                      Option.getOrThrow(invited1.contactDetails).name,
                      Option.getOrThrow(invited2.contactDetails).name,
                    ),
                  ),
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // with authors to invite
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  othersNeedToBeListedYes,
                  invited1,
                  invited2,
                  invited3,
                  removed,
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  authorsToInvite: Option.some(Array.make(Option.getOrThrow(invited2.contactDetails).name)),
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // with removed authors to invite
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  othersNeedToBeListedNo,
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  authorsToInvite: Option.none(),
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // without authors to invite
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  declaredIfAiWasUsedToGenerateNewIdeasYes,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasYes.generativeAiIdeas,
                  license: 'CC0-1.0',
                },
              ],
            ], // AI was used
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // AI was not used
            [
              [
                [
                  datasetReviewWasStarted,
                  ratedTheQualityOfTheDataset1,
                  answeredIfTheDatasetHasEnoughMetadata1,
                  answeredIfTheDatasetHasTrackedChanges1,
                  answeredIfTheDatasetHasDataCensoredOrDeleted1,
                  answeredIfTheDatasetIsAppropriateForThisKindOfResearch1,
                  answeredIfTheDatasetSupportsRelatedConclusions1,
                  answeredIfTheDatasetIsDetailedEnough1,
                  answeredIfTheDatasetMattersToItsAudience1,
                  answeredIfTheDatasetIsErrorFree1,
                  answeredIfTheDatasetIsReadyToBeShared1,
                  answeredIfTheDatasetIsMissingAnything1,
                  personaForDatasetReviewWasChosen1,
                  competingInterestsForADatasetReviewWereDeclared1,
                  declaredThatTheCodeOfConductWasFollowedForADatasetReview,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples,
                  declaredIfAiWasUsedToGenerateNewIdeasYes,
                  declaredIfAiWasUsedToGenerateNewIdeasNo,
                ],
                {
                  author: {
                    orcidId: datasetReviewWasStarted.authorId,
                    persona: Option.some(personaForDatasetReviewWasChosen1.persona),
                  },
                  dataset: datasetReviewWasStarted.datasetId,
                  competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                  qualityRating: {
                    rating: ratedTheQualityOfTheDataset1.rating,
                    detail: ratedTheQualityOfTheDataset1.detail,
                  },
                  answerToIfTheDatasetFollowsFairAndCarePrinciples: {
                    answer: answeredIfTheDatasetFollowsFairAndCarePrinciples.answer,
                    detail: answeredIfTheDatasetFollowsFairAndCarePrinciples.detail,
                  },
                  answerToIfTheDatasetHasEnoughMetadata: {
                    answer: answeredIfTheDatasetHasEnoughMetadata1.answer,
                    detail: answeredIfTheDatasetHasEnoughMetadata1.detail,
                  },
                  answerToIfTheDatasetHasTrackedChanges: {
                    answer: answeredIfTheDatasetHasTrackedChanges1.answer,
                    detail: answeredIfTheDatasetHasTrackedChanges1.detail,
                  },
                  answerToIfTheDatasetHasDataCensoredOrDeleted: {
                    answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                    detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                  },
                  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: {
                    answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                    detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                  },
                  answerToIfTheDatasetSupportsRelatedConclusions: {
                    answer: answeredIfTheDatasetSupportsRelatedConclusions1.answer,
                    detail: answeredIfTheDatasetSupportsRelatedConclusions1.detail,
                  },
                  answerToIfTheDatasetIsDetailedEnough: {
                    answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                    detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                  },
                  answerToIfTheDatasetIsErrorFree: {
                    answer: answeredIfTheDatasetIsErrorFree1.answer,
                    detail: answeredIfTheDatasetIsErrorFree1.detail,
                  },
                  answerToIfTheDatasetMattersToItsAudience: {
                    answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                    detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                  },
                  answerToIfTheDatasetIsReadyToBeShared: {
                    answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                    detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                  },
                  answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                  generativeAiIdeas: declaredIfAiWasUsedToGenerateNewIdeasNo.generativeAiIdeas,
                  license: 'CC-BY-4.0',
                },
              ],
            ], // AI answer changed
          ],
        },
      },
    )
  })

  describe('when it is not ready to be published', () => {
    it.prop(
      'returns an error',
      [fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)],
      ([events]) => {
        const actual = _.GetPreviewForAReviewReadyToBePublished(events)

        expect(actual).toStrictEqual(
          Either.left(
            new DatasetReviews.DatasetReviewNotReadyToBePublished({
              missing: [
                'RatedTheQualityOfTheDataset',
                'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
                'AnsweredIfTheDatasetHasEnoughMetadata',
                'AnsweredIfTheDatasetHasTrackedChanges',
                'AnsweredIfTheDatasetHasDataCensoredOrDeleted',
                'AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch',
                'AnsweredIfTheDatasetSupportsRelatedConclusions',
                'AnsweredIfTheDatasetIsDetailedEnough',
                'AnsweredIfTheDatasetMattersToItsAudience',
                'AnsweredIfTheDatasetIsErrorFree',
                'AnsweredIfTheDatasetIsReadyToBeShared',
                'AnsweredIfTheDatasetIsMissingAnything',
                'PersonaForDatasetReviewWasChosen',
                'DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview',
                'CompetingInterestsForADatasetReviewWereDeclared',
                'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
              ],
            }),
          ),
        )
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted]], // was started
          ],
        },
      },
    )
  })

  describe("when the use of AI hasn't been declared", () => {
    it('returns an error', () => {
      const actual = _.GetPreviewForAReviewReadyToBePublished([
        datasetReviewWasStarted,
        ratedTheQualityOfTheDataset1,
        answeredIfTheDatasetFollowsFairAndCarePrinciples,
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
        declaredThatTheCodeOfConductWasFollowedForADatasetReview,
      ])

      expect(actual).toStrictEqual(
        Either.left(
          new DatasetReviews.DatasetReviewNotReadyToBePublished({
            missing: ['DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview'],
          }),
        ),
      )
    })
  })

  describe('when it is being published', () => {
    it.prop(
      'returns an error',
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      ([events]) => {
        const actual = _.GetPreviewForAReviewReadyToBePublished(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
      },
      {
        fastCheck: {
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
      },
    )
  })

  describe('when it has been published', () => {
    it.prop(
      'returns an error',
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      ([events]) => {
        const actual = _.GetPreviewForAReviewReadyToBePublished(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // was published
            [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
            [[datasetReviewWasStarted, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
          ],
        },
      },
    )
  })

  describe('when it has not been started', () => {
    it.prop(
      'returns an error',
      [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))],
      ([events]) => {
        const actual = _.GetPreviewForAReviewReadyToBePublished(events)

        expect(actual).toStrictEqual(Either.left(new Queries.UnexpectedSequenceOfEvents({})))
      },
      {
        fastCheck: {
          examples: [
            [[]], // no events
            [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
          ],
        },
      },
    )
  })
})
