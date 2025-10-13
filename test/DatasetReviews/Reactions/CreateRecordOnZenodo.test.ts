import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
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
      fc.datasetReviewDataForZenodoRecord({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }),
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
      fc.datasetReviewDataForZenodoRecord({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }),
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
    fc.datasetReviewDataForZenodoRecord(),
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

  test.prop([fc.uuid(), fc.datasetReviewDataForZenodoRecord(), fc.publicPersona(), fc.pseudonymPersona()])(
    "when the record can't be created",
    (datasetReviewId, preview, publicPersona, pseudonymPersona) =>
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

  test.prop([fc.uuid(), fc.datasetReviewDataForZenodoRecord(), fc.anything()])(
    "when the persona can't be loaded",
    (datasetReviewId, preview, error) =>
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
