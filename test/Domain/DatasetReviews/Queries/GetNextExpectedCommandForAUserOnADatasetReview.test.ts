import { Temporal } from '@js-temporal/polyfill'
import { type Array, identity, Option, Predicate } from 'effect'
import * as _ from '../../../../src/Domain/DatasetReviews/Queries/GetNextExpectedCommandForAUserOnADatasetReview.ts'
import * as Datasets from '../../../../src/Domain/Datasets/index.ts'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import { Doi, EmailAddress, Name, NonEmptyString, OrcidId, Uuid } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'
import { describe, expect, it } from '../../../vitest.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new Events.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset1 = new Events.RatedTheQualityOfTheDataset({
  rating: 'poor',
  detail: Option.none(),
  datasetReviewId,
})
const ratedTheQualityOfTheDataset2 = new Events.RatedTheQualityOfTheDataset({
  rating: 'fair',
  detail: NonEmptyString.fromString('some detail'),
  datasetReviewId,
})
const answeredIfTheDatasetFollowsFairAndCarePrinciples1 = new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetFollowsFairAndCarePrinciples2 = new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetHasEnoughMetadata1 = new Events.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasEnoughMetadata2 = new Events.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges1 = new Events.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges2 = new Events.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted1 = new Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'partly',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted2 = new Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'unsure',
  detail: NonEmptyString.fromString('Some detail about unsure'),
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch1 =
  new Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'unsure',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch2 =
  new Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'no',
    detail: NonEmptyString.fromString('Some detail about no'),
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions1 = new Events.AnsweredIfTheDatasetSupportsRelatedConclusions({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetSupportsRelatedConclusions2 = new Events.AnsweredIfTheDatasetSupportsRelatedConclusions({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetIsDetailedEnough1 = new Events.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'partly',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsDetailedEnough2 = new Events.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree1 = new Events.AnsweredIfTheDatasetIsErrorFree({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree2 = new Events.AnsweredIfTheDatasetIsErrorFree({
  answer: 'partly',
  detail: NonEmptyString.fromString('Some detail about partly'),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience1 = new Events.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'unsure',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience2 = new Events.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'not-consequential',
  detail: NonEmptyString.fromString('Some detail about not-consequential'),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared1 = new Events.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'yes',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared2 = new Events.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'no',
  detail: NonEmptyString.fromString('Some detail about no'),
  datasetReviewId,
})
const answeredIfTheDatasetIsMissingAnything1 = new Events.AnsweredIfTheDatasetIsMissingAnything({
  answer: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsMissingAnything2 = new Events.AnsweredIfTheDatasetIsMissingAnything({
  answer: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
  datasetReviewId,
})
const personaForDatasetReviewWasChosen1 = new Events.PersonaForDatasetReviewWasChosen({
  persona: 'public',
  datasetReviewId,
})
const personaForDatasetReviewWasChosen2 = new Events.PersonaForDatasetReviewWasChosen({
  persona: 'pseudonym',
  datasetReviewId,
})
const answeredYesIfOthersNeedToBeListedOnTheReview = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId,
})
const answeredNoIfOthersNeedToBeListedOnTheReview = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'no',
  datasetReviewId,
})
const invitationToAppearOnADatasetReviewAddedToTheList = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  invitationId: Uuid.Uuid('9af6576d-1733-4461-a000-a31d2b172e5d'),
  contactDetails: Option.some({
    name: Name.Name('Arne Saknussemm'),
    emailAddress: EmailAddress.EmailAddress('arnesaknussemm@example.com'),
  }),
  datasetReviewId,
})
const invitationToAppearOnADatasetReviewAddedToTheList2 = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  invitationId: Uuid.Uuid('ab2d3965-8f40-4de8-97cd-73322daa5dda'),
  contactDetails: Option.some({
    name: Name.Name('Arne Saknussemm'),
    emailAddress: EmailAddress.EmailAddress('arnesaknussemm@example.com'),
  }),
  datasetReviewId,
})
const invitationToAppearOnADatasetReviewRemovedFromTheList =
  new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList({
    invitationId: Uuid.Uuid('9af6576d-1733-4461-a000-a31d2b172e5d'),
    datasetReviewId,
  })
const declaredIfAiWasUsedToGenerateNewIdeas1 = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'no' },
  datasetReviewId,
})
const declaredIfAiWasUsedToGenerateNewIdeas2 = new Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview({
  generativeAiIdeas: { answer: 'yes', detail: Option.none() },
  datasetReviewId,
})
const competingInterestsForADatasetReviewWereDeclared1 = new Events.CompetingInterestsForADatasetReviewWereDeclared({
  competingInterests: Option.none(),
  datasetReviewId,
})
const competingInterestsForADatasetReviewWereDeclared2 = new Events.CompetingInterestsForADatasetReviewWereDeclared({
  competingInterests: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
  datasetReviewId,
})
const declaredThatTheCodeOfConductWasFollowedForADatasetReview1 =
  new Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant().subtract({ minutes: 1 }),
    datasetReviewId,
  })
const declaredThatTheCodeOfConductWasFollowedForADatasetReview2 =
  new Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant(),
    datasetReviewId,
  })
const publicationOfDatasetReviewWasRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new Events.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetNextExpectedCommandForAUserOnADatasetReview', () => {
  describe('when it has not been started', () => {
    it.prop(
      'returns nothing to do',
      [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))],
      ([events]) => {
        const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

        expect(actual).toStrictEqual(Option.none())
      },
      {
        fastCheck: {
          examples: [
            [[]], // no events
            [[answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished]], // with events
          ],
        },
      },
    )
  })

  describe('when it is in progress', () => {
    it.each<[string, ReadonlyArray<Events.DatasetReviewEvent>, _.NextExpectedCommand]>([
      [
        'flow completed up choice of persona',
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
        'AnswerIfOthersNeedToBeListedOnTheReview',
      ],
      [
        'answered yes to others needing to be listed',
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
          answeredYesIfOthersNeedToBeListedOnTheReview,
        ],
        'AddInvitationToAppearOnADatasetReviewToTheList',
      ],
      [
        'added an invitation',
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
          answeredYesIfOthersNeedToBeListedOnTheReview,
          invitationToAppearOnADatasetReviewAddedToTheList,
        ],
        'DeclareIfAiWasUsedToGenerateNewIdeas',
      ],
      [
        'added and removed an invitation',
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
          answeredYesIfOthersNeedToBeListedOnTheReview,
          invitationToAppearOnADatasetReviewAddedToTheList,
          invitationToAppearOnADatasetReviewRemovedFromTheList,
        ],
        'AddInvitationToAppearOnADatasetReviewToTheList',
      ],
      [
        'added multiple invitations',
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
          answeredYesIfOthersNeedToBeListedOnTheReview,
          invitationToAppearOnADatasetReviewAddedToTheList,
          invitationToAppearOnADatasetReviewRemovedFromTheList,
          invitationToAppearOnADatasetReviewAddedToTheList2,
        ],
        'DeclareIfAiWasUsedToGenerateNewIdeas',
      ],
    ])('returns the next expected command', (_name, events, expected) => {
      const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

      expect(actual).toStrictEqual(Option.some(expected))
    })

    it.prop(
      'returns the next expected command',
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
            fc.answeredIfOthersNeedToBeListedOnTheReview(),
            fc.invitationToAppearOnADatasetReviewAddedToTheList(),
            fc.declaredIfAiWasUsedToGenerateNewIdeasForADatasetReview(),
            fc.competingInterestsForADatasetReviewWereDeclared(),
            fc.declaredThatTheCodeOfConductWasFollowedForADatasetReview(),
          )
          .map(identity<Array.NonEmptyReadonlyArray<Events.DatasetReviewEvent>>),
        fc.constant<_.NextExpectedCommand>('PublishDatasetReview'),
      ],
      ([events, expected]) => {
        const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

        expect(actual).toStrictEqual(Option.some(expected))
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted], 'RateTheQuality'], // was started
            [[datasetReviewWasStarted, ratedTheQualityOfTheDataset1], 'AnswerIfTheDatasetFollowsFairAndCarePrinciples'], // 1 question answered
            [
              [
                datasetReviewWasStarted,
                ratedTheQualityOfTheDataset1,
                answeredIfTheDatasetFollowsFairAndCarePrinciples1,
              ],
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
                answeredNoIfOthersNeedToBeListedOnTheReview,
              ],
              'DeclareIfAiWasUsedToGenerateNewIdeas',
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
                answeredNoIfOthersNeedToBeListedOnTheReview,
                declaredIfAiWasUsedToGenerateNewIdeas1,
              ],
              'DeclareCompetingInterests',
            ], // use of AI declared
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
                answeredNoIfOthersNeedToBeListedOnTheReview,
                declaredIfAiWasUsedToGenerateNewIdeas1,
                competingInterestsForADatasetReviewWereDeclared1,
              ],
              'DeclareFollowingCodeOfConduct',
            ], // competing interests declared
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
                answeredNoIfOthersNeedToBeListedOnTheReview,
                declaredIfAiWasUsedToGenerateNewIdeas1,
                competingInterestsForADatasetReviewWereDeclared1,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
              ],
              'PublishDatasetReview',
            ], // declared following code of conduct
            [
              [
                datasetReviewWasStarted,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
                declaredIfAiWasUsedToGenerateNewIdeas1,
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
                answeredNoIfOthersNeedToBeListedOnTheReview,
                declaredIfAiWasUsedToGenerateNewIdeas2,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview2,
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
      },
    )
  })

  describe('when it is being published', () => {
    it.prop(
      'returns nothing to do',
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
          .map(identity<Array.NonEmptyReadonlyArray<Events.DatasetReviewEvent>>),
      ],
      ([events]) => {
        const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

        expect(actual).toStrictEqual(Option.none())
      },
      {
        fastCheck: {
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
      },
    )
  })

  describe('when it has been published', () => {
    it.prop(
      'returns nothing to do',
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
          .map(identity<Array.NonEmptyReadonlyArray<Events.DatasetReviewEvent>>),
      ],
      ([events]) => {
        const actual = _.GetNextExpectedCommandForAUserOnADatasetReview(events)

        expect(actual).toStrictEqual(Option.none())
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples1, datasetReviewWasPublished]], // was published
            [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
            [[datasetReviewWasStarted, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples1]], // different order
          ],
        },
      },
    )
  })
})
