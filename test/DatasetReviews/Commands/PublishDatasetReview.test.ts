import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/PublishDatasetReview.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const ratedTheQualityOfTheDataset = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'poor',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
    answer: 'no',
    detail: Option.none(),
    datasetReviewId,
  })
const answeredIfTheDatasetHasEnoughMetadata = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({
  answer: 'yes',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasTrackedChanges = new DatasetReviews.AnsweredIfTheDatasetHasTrackedChanges({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetHasDataCensoredOrDeleted = new DatasetReviews.AnsweredIfTheDatasetHasDataCensoredOrDeleted({
  answer: 'partly',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsAppropriateForThisKindOfResearch =
  new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
    answer: 'no',
    detail: NonEmptyString.fromString('Some detail about no'),
    datasetReviewId,
  })
const answeredIfTheDatasetSupportsRelatedConclusions =
  new DatasetReviews.AnsweredIfTheDatasetSupportsRelatedConclusions({
    answer: 'yes',
    detail: NonEmptyString.fromString('Some detail about yes'),
    datasetReviewId,
  })
const answeredIfTheDatasetIsDetailedEnough = new DatasetReviews.AnsweredIfTheDatasetIsDetailedEnough({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const answeredIfTheDatasetIsErrorFree = new DatasetReviews.AnsweredIfTheDatasetIsErrorFree({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetMattersToItsAudience = new DatasetReviews.AnsweredIfTheDatasetMattersToItsAudience({
  answer: 'unsure',
  detail: Option.none(),
  datasetReviewId,
})
const answeredIfTheDatasetIsReadyToBeShared = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'no',
  detail: NonEmptyString.fromString('Some detail about no'),
  datasetReviewId,
})
const answeredIfTheDatasetIsMissingAnything = new DatasetReviews.AnsweredIfTheDatasetIsMissingAnything({
  answer: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
  datasetReviewId,
})
const personaForDatasetReviewWasChosen = new DatasetReviews.PersonaForDatasetReviewWasChosen({
  persona: 'public',
  datasetReviewId,
})
const competingInterestsForADatasetReviewWereDeclared =
  new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
    competingInterests: Option.none(),
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

describe('foldState', () => {
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
    ],
  })('not started', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop(
    [
      fc
        .datasetReviewWasStarted()
        .map(event =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.NotReady['missing']]>(
            Array.of(event),
            [
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
              'CompetingInterestsForADatasetReviewWereDeclared',
              'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
            ],
          ),
        ),
    ],
    {
      examples: [
        [
          [
            [started],
            [
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
              'CompetingInterestsForADatasetReviewWereDeclared',
              'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
            ],
          ],
        ], // was started
        [
          [
            [started, answeredIfTheDatasetFollowsFairAndCarePrinciples],
            [
              'RatedTheQualityOfTheDataset',
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
              'CompetingInterestsForADatasetReviewWereDeclared',
              'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
            ],
          ],
        ], // one question answered
        [
          [
            [
              started,
              ratedTheQualityOfTheDataset,
              answeredIfTheDatasetFollowsFairAndCarePrinciples,
              answeredIfTheDatasetHasEnoughMetadata,
              answeredIfTheDatasetHasTrackedChanges,
              answeredIfTheDatasetHasDataCensoredOrDeleted,
              answeredIfTheDatasetIsAppropriateForThisKindOfResearch,
              answeredIfTheDatasetSupportsRelatedConclusions,
              answeredIfTheDatasetIsDetailedEnough,
              answeredIfTheDatasetMattersToItsAudience,
              answeredIfTheDatasetIsErrorFree,
              answeredIfTheDatasetIsReadyToBeShared,
              answeredIfTheDatasetIsMissingAnything,
              personaForDatasetReviewWasChosen,
              competingInterestsForADatasetReviewWereDeclared,
            ],
            ['DeclaredThatTheCodeOfConductWasFollowedForADatasetReview'],
          ],
        ], // one missing
      ],
    },
  )('not ready', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotReady({ missing: expected }))
  })

  test.prop(
    [
      fc
        .tuple(
          fc.datasetReviewWasStarted(),
          fc.ratedTheQualityOfTheDataset(),
          fc.answeredIfTheDatasetFollowsFairAndCarePrinciples(),
          fc.answeredIfTheDatasetHasEnoughMetadata(),
          fc.answeredIfTheDatasetHasEnoughMetadata(),
          fc.answeredIfTheDatasetHasTrackedChanges(),
          fc.answeredIfTheDatasetHasDataCensoredOrDeleted(),
          fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch(),
          fc.answeredIfTheDatasetSupportsRelatedConclusions(),
          fc.answeredIfTheDatasetIsDetailedEnough(),
          fc.answeredIfTheDatasetMattersToItsAudience(),
          fc.answeredIfTheDatasetIsErrorFree(),
          fc.answeredIfTheDatasetIsReadyToBeShared(),
          fc.answeredIfTheDatasetIsMissingAnything(),
          fc.personaForDatasetReviewWasChosen(),
          fc.competingInterestsForADatasetReviewWereDeclared(),
          fc.declaredThatTheCodeOfConductWasFollowedForADatasetReview(),
        )
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [
          [
            started,
            ratedTheQualityOfTheDataset,
            answeredIfTheDatasetFollowsFairAndCarePrinciples,
            answeredIfTheDatasetHasEnoughMetadata,
            answeredIfTheDatasetHasTrackedChanges,
            answeredIfTheDatasetHasDataCensoredOrDeleted,
            answeredIfTheDatasetIsAppropriateForThisKindOfResearch,
            answeredIfTheDatasetSupportsRelatedConclusions,
            answeredIfTheDatasetIsDetailedEnough,
            answeredIfTheDatasetMattersToItsAudience,
            answeredIfTheDatasetIsErrorFree,
            answeredIfTheDatasetIsReadyToBeShared,
            answeredIfTheDatasetIsMissingAnything,
            personaForDatasetReviewWasChosen,
            competingInterestsForADatasetReviewWereDeclared,
            declaredThatTheCodeOfConductWasFollowedForADatasetReview,
          ],
        ], // answered
        [
          [
            declaredThatTheCodeOfConductWasFollowedForADatasetReview,
            competingInterestsForADatasetReviewWereDeclared,
            personaForDatasetReviewWasChosen,
            answeredIfTheDatasetIsMissingAnything,
            answeredIfTheDatasetIsReadyToBeShared,
            answeredIfTheDatasetIsErrorFree,
            answeredIfTheDatasetMattersToItsAudience,
            answeredIfTheDatasetIsDetailedEnough,
            answeredIfTheDatasetSupportsRelatedConclusions,
            answeredIfTheDatasetIsAppropriateForThisKindOfResearch,
            answeredIfTheDatasetHasDataCensoredOrDeleted,
            answeredIfTheDatasetHasTrackedChanges,
            answeredIfTheDatasetHasEnoughMetadata,
            answeredIfTheDatasetFollowsFairAndCarePrinciples,
            ratedTheQualityOfTheDataset,
            started,
          ],
        ], // different order
      ],
    },
  )('is ready', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.IsReady())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, publicationOfDatasetReviewWasRequested]], // was requested
        [[started, answeredIfTheDatasetFollowsFairAndCarePrinciples, publicationOfDatasetReviewWasRequested]], // also answered
        [[started, publicationOfDatasetReviewWasRequested, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
      ],
    },
  )('is being published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.IsBeingPublished())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // was published
        [
          [
            started,
            answeredIfTheDatasetFollowsFairAndCarePrinciples,
            publicationOfDatasetReviewWasRequested,
            datasetReviewWasPublished,
          ],
        ], // also requested
        [[started, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
      ],
    },
  )('has been published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasBeenPublished())
  })
})

describe('decide', () => {
  test('has not been started', () => {
    const result = _.decide(new _.NotStarted(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop([fc.nonEmptyArray(fc.constant('AnsweredIfTheDatasetFollowsFairAndCarePrinciples'))])(
    'is not ready',
    missing => {
      const result = _.decide(new _.NotReady({ missing }), { datasetReviewId })

      expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewNotReadyToBePublished({ missing })))
    },
  )

  test('is ready', () => {
    const result = _.decide(new _.IsReady(), { datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.PublicationOfDatasetReviewWasRequested({ datasetReviewId }))),
    )
  })

  test('is being published', () => {
    const result = _.decide(new _.IsBeingPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  test('has been published', () => {
    const result = _.decide(new _.HasBeenPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})
