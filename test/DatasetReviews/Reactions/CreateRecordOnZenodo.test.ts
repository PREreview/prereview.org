import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe, Struct } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/CreateRecordOnZenodo.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Zenodo from '../../../src/Zenodo/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('CreateRecordOnZenodo', () => {
  describe('when the command can be completed', () => {
    test.prop([
      fc.uuid(),
      fc.record<DatasetReviews.DataForZenodoRecord>({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }),
        dataset: fc.datasetId(),
        competingInterests: fc.competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
        qualityRating: fc.maybe(fc.ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
          .answeredIfTheDatasetFollowsFairAndCarePrinciples()
          .map(Struct.pick('answer', 'detail')),
        answerToIfTheDatasetHasEnoughMetadata: fc.maybe(
          fc.answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
        ),
        answerToIfTheDatasetHasTrackedChanges: fc.maybe(
          fc.answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
        ),
        answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(
          fc.answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
          fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(
          fc.answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsDetailedEnough: fc.maybe(
          fc.answeredIfTheDatasetIsDetailedEnough().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsErrorFree: fc.maybe(fc.answeredIfTheDatasetIsErrorFree().map(Struct.get('answer'))),
        answerToIfTheDatasetMattersToItsAudience: fc.maybe(
          fc.answeredIfTheDatasetMattersToItsAudience().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsReadyToBeShared: fc.maybe(
          fc.answeredIfTheDatasetIsReadyToBeShared().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsMissingAnything: fc.answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
      }),
      fc.publicPersona(),
      fc.integer(),
    ])('with a public persona', (datasetReviewId, preview, publicPersona, recordId) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewCommands, { markRecordCreatedOnZenodo: () => Effect.void }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getDataForZenodoRecord: () => Effect.succeed(preview),
            }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
            }),
            Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc.record<DatasetReviews.DataForZenodoRecord>({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }),
        dataset: fc.datasetId(),
        competingInterests: fc.competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
        qualityRating: fc.maybe(fc.ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
          .answeredIfTheDatasetFollowsFairAndCarePrinciples()
          .map(Struct.pick('answer', 'detail')),
        answerToIfTheDatasetHasEnoughMetadata: fc.maybe(
          fc.answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
        ),
        answerToIfTheDatasetHasTrackedChanges: fc.maybe(
          fc.answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
        ),
        answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(
          fc.answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
          fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(
          fc.answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsDetailedEnough: fc.maybe(
          fc.answeredIfTheDatasetIsDetailedEnough().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsErrorFree: fc.maybe(fc.answeredIfTheDatasetIsErrorFree().map(Struct.get('answer'))),
        answerToIfTheDatasetMattersToItsAudience: fc.maybe(
          fc.answeredIfTheDatasetMattersToItsAudience().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsReadyToBeShared: fc.maybe(
          fc.answeredIfTheDatasetIsReadyToBeShared().map(Struct.get('answer')),
        ),
        answerToIfTheDatasetIsMissingAnything: fc.answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
      }),
      fc.pseudonymPersona(),
      fc.integer(),
    ])('with a public persona', (datasetReviewId, preview, pseudonymPersona, recordId) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewCommands, { markRecordCreatedOnZenodo: () => Effect.void }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getDataForZenodoRecord: () => Effect.succeed(preview),
            }),
            Layer.mock(Personas.Personas, {
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.record<DatasetReviews.DataForZenodoRecord>({
      author: fc.record({ orcidId: fc.orcidId(), persona: fc.constantFrom('public', 'pseudonym') }),
      dataset: fc.datasetId(),
      competingInterests: fc.competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
      qualityRating: fc.maybe(fc.ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
        .answeredIfTheDatasetFollowsFairAndCarePrinciples()
        .map(Struct.pick('answer', 'detail')),
      answerToIfTheDatasetHasEnoughMetadata: fc.maybe(
        fc.answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
      ),
      answerToIfTheDatasetHasTrackedChanges: fc.maybe(
        fc.answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
      ),
      answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(
        fc.answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
        fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(
        fc.answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsDetailedEnough: fc.maybe(
        fc.answeredIfTheDatasetIsDetailedEnough().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsErrorFree: fc.maybe(fc.answeredIfTheDatasetIsErrorFree().map(Struct.get('answer'))),
      answerToIfTheDatasetMattersToItsAudience: fc.maybe(
        fc.answeredIfTheDatasetMattersToItsAudience().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsReadyToBeShared: fc.maybe(
        fc.answeredIfTheDatasetIsReadyToBeShared().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsMissingAnything: fc.answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
    }),
    fc.publicPersona(),
    fc.pseudonymPersona(),
    fc.integer(),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenStarted(),
      new DatasetReviews.DatasetReviewAlreadyHasAZenodoRecord({}),
      new DatasetReviews.NotAuthorizedToRunCommand({}),
      new DatasetReviews.UnableToHandleCommand({}),
    ),
  ])(
    "when the command can't be completed",
    (datasetReviewId, preview, publicPersona, pseudonymPersona, recordId, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewCommands, { markRecordCreatedOnZenodo: () => error }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getDataForZenodoRecord: () => Effect.succeed(preview),
            }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.record<DatasetReviews.DataForZenodoRecord>({
      author: fc.record({ orcidId: fc.orcidId(), persona: fc.constantFrom('public', 'pseudonym') }),
      dataset: fc.datasetId(),
      competingInterests: fc.competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
      qualityRating: fc.maybe(fc.ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
        .answeredIfTheDatasetFollowsFairAndCarePrinciples()
        .map(Struct.pick('answer', 'detail')),
      answerToIfTheDatasetHasEnoughMetadata: fc.maybe(
        fc.answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
      ),
      answerToIfTheDatasetHasTrackedChanges: fc.maybe(
        fc.answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
      ),
      answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(
        fc.answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
        fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(
        fc.answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsDetailedEnough: fc.maybe(
        fc.answeredIfTheDatasetIsDetailedEnough().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsErrorFree: fc.maybe(fc.answeredIfTheDatasetIsErrorFree().map(Struct.get('answer'))),
      answerToIfTheDatasetMattersToItsAudience: fc.maybe(
        fc.answeredIfTheDatasetMattersToItsAudience().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsReadyToBeShared: fc.maybe(
        fc.answeredIfTheDatasetIsReadyToBeShared().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsMissingAnything: fc.answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
    }),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])("when the record can't be created", (datasetReviewId, preview, publicPersona, pseudonymPersona) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getDataForZenodoRecord: () => Effect.succeed(preview),
          }),
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
          Layer.mock(Zenodo.Zenodo, {
            createRecordForDatasetReview: () => new Zenodo.FailedToCreateRecordForDatasetReview({}),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.record<DatasetReviews.DataForZenodoRecord>({
      author: fc.record({ orcidId: fc.orcidId(), persona: fc.constantFrom('public', 'pseudonym') }),
      dataset: fc.datasetId(),
      competingInterests: fc.competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
      qualityRating: fc.maybe(fc.ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
        .answeredIfTheDatasetFollowsFairAndCarePrinciples()
        .map(Struct.pick('answer', 'detail')),
      answerToIfTheDatasetHasEnoughMetadata: fc.maybe(
        fc.answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
      ),
      answerToIfTheDatasetHasTrackedChanges: fc.maybe(
        fc.answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
      ),
      answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(
        fc.answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
        fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(
        fc.answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsDetailedEnough: fc.maybe(
        fc.answeredIfTheDatasetIsDetailedEnough().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsErrorFree: fc.maybe(fc.answeredIfTheDatasetIsErrorFree().map(Struct.get('answer'))),
      answerToIfTheDatasetMattersToItsAudience: fc.maybe(
        fc.answeredIfTheDatasetMattersToItsAudience().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsReadyToBeShared: fc.maybe(
        fc.answeredIfTheDatasetIsReadyToBeShared().map(Struct.get('answer')),
      ),
      answerToIfTheDatasetIsMissingAnything: fc.answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
    }),
    fc.anything(),
  ])("when the persona can't be loaded", (datasetReviewId, preview, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getDataForZenodoRecord: () => Effect.succeed(preview),
          }),
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
          }),
          Layer.mock(Zenodo.Zenodo, {
            createRecordForDatasetReview: () => new Zenodo.FailedToCreateRecordForDatasetReview({}),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.constantFrom(
      new DatasetReviews.UnknownDatasetReview({}),
      new DatasetReviews.DatasetReviewIsInProgress(),
      new DatasetReviews.DatasetReviewHasBeenPublished(),
      new DatasetReviews.UnableToQuery({}),
    ),
  ])("when the data can't be generated", (datasetReviewId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getDataForZenodoRecord: () => error }),
          Layer.mock(Personas.Personas, {}),
          Layer.mock(Zenodo.Zenodo, {}),
        ),
      ),
      EffectTest.run,
    ),
  )
})
