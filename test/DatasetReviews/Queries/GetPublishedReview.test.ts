import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/GetPublishedReview.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import * as Queries from '../../../src/Queries.ts'
import { Doi, EmailAddress, Name, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
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
const answeredNo = new DatasetReviews.AnsweredIfOthersNeedToBeListedOnTheReview({
  datasetReviewId,
  answer: 'no',
})
const answeredYes = new DatasetReviews.AnsweredIfOthersNeedToBeListedOnTheReview({
  datasetReviewId,
  answer: 'yes',
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
const invited4 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('9314efeb-0295-4aa7-a073-fe7129de5c1b'),
  contactDetails: Option.none(),
})
const invited5 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('4cb6872f-12e3-4c6f-a85a-c59dacb908f4'),
  contactDetails: Option.none(),
})
const invited6 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid.Uuid('d9f79761-3212-4640-8965-7d4b1ea9bb72'),
  contactDetails: Option.none(),
})
const invited1Removed = new DatasetReviews.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId,
  invitationId: invited1.invitationId,
})
const invited2AcceptedByAuthor = new Events.AuthorInviteAccepted({
  invitationId: invited2.invitationId,
  reviewId: datasetReviewId,
  orcidId: authorId,
  acceptedAt: Temporal.Now.instant(),
})
const invited3Accepted = new Events.AuthorInviteAccepted({
  invitationId: invited3.invitationId,
  reviewId: datasetReviewId,
  orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
  acceptedAt: Temporal.Now.instant(),
})
const invited3Persona = new Events.PersonaForAReviewChosen({
  reviewId: datasetReviewId,
  orcidId: invited3Accepted.orcidId,
  persona: 'pseudonym',
})
const invited3Persona2 = new Events.PersonaForAReviewChosen({
  reviewId: datasetReviewId,
  orcidId: invited3Accepted.orcidId,
  persona: 'public',
})
const invited3Confirmed = new Events.AuthorChoicesForAReviewConfirmed({
  reviewId: datasetReviewId,
  orcidId: invited3Accepted.orcidId,
  confirmedAt: Temporal.Now.instant(),
})
const invited4Accepted = new Events.AuthorInviteAccepted({
  invitationId: invited4.invitationId,
  reviewId: datasetReviewId,
  orcidId: invited3Accepted.orcidId,
  acceptedAt: Temporal.Now.instant(),
})
const invited5Accepted = new Events.AuthorInviteAccepted({
  invitationId: invited5.invitationId,
  reviewId: datasetReviewId,
  orcidId: OrcidId.OrcidId('0000-0003-4921-6155'),
  acceptedAt: Temporal.Now.instant(),
})
const invited5Persona = new Events.PersonaForAReviewChosen({
  reviewId: datasetReviewId,
  orcidId: invited5Accepted.orcidId,
  persona: 'public',
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
        'returns the DOI',
        [
          fc
            .tuple(
              fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.answeredIfTheDatasetFollowsFairAndCarePrinciples({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.personaForDatasetReviewWasChosen({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.datasetReviewWasAssignedADoi({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.datasetReviewWasPublished({ datasetReviewId: fc.constant(datasetReviewId) }),
            )
            .map(events =>
              Tuple.make<[Array.NonEmptyReadonlyArray<Events.Event>, _.PublishedReview]>(events, {
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
                published:
                  events[4].publicationDate instanceof Temporal.Instant
                    ? events[4].publicationDate.toZonedDateTimeISO('UTC').toPlainDate()
                    : events[4].publicationDate,
              }),
            ),
        ],
        ([[events, expected]]) => {
          const { query } = _.GetPublishedReview

          const actual = query(events, datasetReviewId)

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
                      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some({
                        answer: answeredIfTheDatasetHasDataCensoredOrDeleted1.answer,
                        detail: answeredIfTheDatasetHasDataCensoredOrDeleted1.detail,
                      }),
                      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some({
                        answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.answer,
                        detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch1.detail,
                      }),
                      answerToIfTheDatasetSupportsRelatedConclusions: Option.some({
                        answer: answeredIfTheDatasetSupportsRelatedConclusion1.answer,
                        detail: answeredIfTheDatasetSupportsRelatedConclusion1.detail,
                      }),
                      answerToIfTheDatasetIsDetailedEnough: Option.some({
                        answer: answeredIfTheDatasetIsDetailedEnough1.answer,
                        detail: answeredIfTheDatasetIsDetailedEnough1.detail,
                      }),
                      answerToIfTheDatasetIsErrorFree: Option.some({
                        answer: answeredIfTheDatasetIsErrorFree1.answer,
                        detail: answeredIfTheDatasetIsErrorFree1.detail,
                      }),
                      answerToIfTheDatasetMattersToItsAudience: Option.some({
                        answer: answeredIfTheDatasetMattersToItsAudience1.answer,
                        detail: answeredIfTheDatasetMattersToItsAudience1.detail,
                      }),
                      answerToIfTheDatasetIsReadyToBeShared: Option.some({
                        answer: answeredIfTheDatasetIsReadyToBeShared1.answer,
                        detail: answeredIfTheDatasetIsReadyToBeShared1.detail,
                      }),
                      answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything1.answer,
                    },
                    competingInterests: competingInterestsForADatasetReviewWereDeclared1.competingInterests,
                    published: datasetReviewWasPublished1.publicationDate as Temporal.PlainDate,
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
                      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some({
                        answer: answeredIfTheDatasetHasDataCensoredOrDeleted2.answer,
                        detail: answeredIfTheDatasetHasDataCensoredOrDeleted2.detail,
                      }),
                      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some({
                        answer: answeredIfTheDatasetIsAppropriateForThisKindOfResearch2.answer,
                        detail: answeredIfTheDatasetIsAppropriateForThisKindOfResearch2.detail,
                      }),
                      answerToIfTheDatasetSupportsRelatedConclusions: Option.some({
                        answer: answeredIfTheDatasetSupportsRelatedConclusion2.answer,
                        detail: answeredIfTheDatasetSupportsRelatedConclusion2.detail,
                      }),
                      answerToIfTheDatasetIsDetailedEnough: Option.some({
                        answer: answeredIfTheDatasetIsDetailedEnough2.answer,
                        detail: answeredIfTheDatasetIsDetailedEnough2.detail,
                      }),
                      answerToIfTheDatasetIsErrorFree: Option.some({
                        answer: answeredIfTheDatasetIsErrorFree2.answer,
                        detail: answeredIfTheDatasetIsErrorFree2.detail,
                      }),
                      answerToIfTheDatasetMattersToItsAudience: Option.some({
                        answer: answeredIfTheDatasetMattersToItsAudience2.answer,
                        detail: answeredIfTheDatasetMattersToItsAudience2.detail,
                      }),
                      answerToIfTheDatasetIsReadyToBeShared: Option.some({
                        answer: answeredIfTheDatasetIsReadyToBeShared2.answer,
                        detail: answeredIfTheDatasetIsReadyToBeShared2.detail,
                      }),
                      answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything2.answer,
                    },
                    competingInterests: competingInterestsForADatasetReviewWereDeclared2.competingInterests,
                    published: datasetReviewWasPublished2.publicationDate as Temporal.PlainDate,
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
                    published: datasetReviewWasPublished1.publicationDate as Temporal.PlainDate,
                  },
                ],
              ], // different order
              [
                [
                  [
                    datasetReviewWasStarted,
                    answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                    answeredYes,
                    invited1,
                    datasetReviewWasAssignedADoi1,
                    datasetReviewWasPublished1,
                  ],
                  {
                    author: { orcidId: datasetReviewWasStarted.authorId, persona: 'public' },
                    otherAuthors: [],
                    anonymousAuthors: 1,
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
                    published: datasetReviewWasPublished1.publicationDate as Temporal.PlainDate,
                  },
                ],
              ], // invited author
              [
                [
                  [
                    datasetReviewWasStarted,
                    answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                    answeredYes,
                    invited1,
                    invited2,
                    invited3,
                    invited4,
                    invited5,
                    invited6,
                    invited1Removed,
                    invited2AcceptedByAuthor,
                    invited3Accepted,
                    invited3Persona,
                    invited3Persona2,
                    invited3Confirmed,
                    invited4Accepted,
                    invited5Accepted,
                    invited5Persona,
                    datasetReviewWasAssignedADoi1,
                    datasetReviewWasPublished1,
                  ],
                  {
                    author: { orcidId: datasetReviewWasStarted.authorId, persona: 'public' },
                    otherAuthors: [{ orcidId: invited3Accepted.orcidId, persona: invited3Persona2.persona }],
                    anonymousAuthors: 2,
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
                    published: datasetReviewWasPublished1.publicationDate as Temporal.PlainDate,
                  },
                ],
              ], // multiple invited authors
              [
                [
                  [
                    datasetReviewWasStarted,
                    answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                    answeredNo,
                    datasetReviewWasAssignedADoi1,
                    datasetReviewWasPublished1,
                  ],
                  {
                    author: { orcidId: datasetReviewWasStarted.authorId, persona: 'public' },
                    otherAuthors: [],
                    anonymousAuthors: 0,
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
                    published: datasetReviewWasPublished1.publicationDate as Temporal.PlainDate,
                  },
                ],
              ], // no other authors
            ],
          },
        },
      )
    })

    describe("when the data isn't available", () => {
      it.prop(
        'returns an error',
        [
          fc
            .tuple(
              fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.answeredIfTheDatasetFollowsFairAndCarePrinciples({ datasetReviewId: fc.constant(datasetReviewId) }),
              fc.datasetReviewWasPublished({ datasetReviewId: fc.constant(datasetReviewId) }),
            )
            .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
        ],
        ([events]) => {
          const { query } = _.GetPublishedReview

          const actual = query(events, datasetReviewId)

          expect(actual).toStrictEqual(Either.left(new Queries.UnexpectedSequenceOfEvents({})))
        },
        {
          fastCheck: {
            examples: [
              [[datasetReviewWasStarted, datasetReviewWasAssignedADoi1, datasetReviewWasPublished1]], // no AnsweredIfTheDatasetFollowsFairAndCarePrinciples
              [
                [
                  datasetReviewWasStarted,
                  answeredIfTheDatasetFollowsFairAndCarePrinciples1,
                  datasetReviewWasPublished1,
                ],
              ], // no DatasetReviewWasAssignedADoi
            ],
          },
        },
      )
    })
  })

  describe('when it has not been published', () => {
    it.prop(
      'returns an error',
      [
        fc
          .nonEmptyArray(
            fc
              .datasetReviewEvent({ datasetReviewId: fc.constant(datasetReviewId) })
              .filter(Predicate.not(Predicate.isTagged('DatasetReviewWasPublished'))),
          )
          .filter(Array.some(Predicate.isTagged('DatasetReviewWasStarted'))),
      ],
      ([events]) => {
        const { query } = _.GetPublishedReview

        const actual = query(events, datasetReviewId)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})))
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted]], // was started
            [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples1]], // with answer
            [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested]], // publication was requested
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
        const { query } = _.GetPublishedReview

        const actual = query(events, datasetReviewId)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnknownDatasetReview({})))
      },
      {
        fastCheck: {
          examples: [
            [[]], // no events
            [[answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished1]], // with events
          ],
        },
      },
    )
  })
})
