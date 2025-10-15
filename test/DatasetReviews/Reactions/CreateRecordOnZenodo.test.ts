import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/CreateRecordOnZenodo.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import * as Zenodo from '../../../src/Zenodo/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('CreateRecordOnZenodo', () => {
  describe('when the command can be completed', () => {
    test.prop([
      fc.uuid(),
      fc.origin(),
      fc.datasetReviewDataForZenodoRecord({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }),
      }),
      fc.datasetTitle(),
      fc.publicPersona(),
      fc.integer(),
    ])('with a public persona', (datasetReviewId, publicUrl, preview, datasetTitle, publicPersona, recordId) =>
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
            Layer.mock(Datasets.Datasets, { getDatasetTitle: () => Effect.succeed(datasetTitle) }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
            }),
            Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc.origin(),
      fc.datasetReviewDataForZenodoRecord({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }),
      }),
      fc.datasetTitle(),
      fc.pseudonymPersona(),
      fc.integer(),
    ])('with a public persona', (datasetReviewId, publicUrl, preview, datasetTitle, pseudonymPersona, recordId) =>
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
            Layer.mock(Datasets.Datasets, { getDatasetTitle: () => Effect.succeed(datasetTitle) }),
            Layer.mock(Personas.Personas, {
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.origin(),
    fc.datasetReviewDataForZenodoRecord(),
    fc.datasetTitle(),
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
    (datasetReviewId, publicUrl, preview, datasetTitle, publicPersona, pseudonymPersona, recordId, error) =>
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
            Layer.mock(Datasets.Datasets, { getDatasetTitle: () => Effect.succeed(datasetTitle) }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.origin(),
    fc.datasetReviewDataForZenodoRecord(),
    fc.datasetTitle(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    "when the record can't be created",
    (datasetReviewId, publicUrl, preview, datasetTitle, publicPersona, pseudonymPersona) =>
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
            Layer.mock(Datasets.Datasets, { getDatasetTitle: () => Effect.succeed(datasetTitle) }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Zenodo.Zenodo, {
              createRecordForDatasetReview: () => new Zenodo.FailedToCreateRecordForDatasetReview({}),
            }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.origin(),
    fc.datasetReviewDataForZenodoRecord(),
    fc
      .record({ cause: fc.anything(), datasetId: fc.datasetId() })
      .chain(args => fc.constantFrom(new Datasets.DatasetIsNotFound(args), new Datasets.DatasetIsUnavailable(args))),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    "when the dataset can't be loaded",
    (datasetReviewId, publicUrl, preview, error, publicPersona, pseudonymPersona) =>
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
            Layer.mock(Datasets.Datasets, { getDatasetTitle: () => error }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Zenodo.Zenodo, {}),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.origin(), fc.datasetReviewDataForZenodoRecord(), fc.datasetTitle(), fc.anything()])(
    "when the persona can't be loaded",
    (datasetReviewId, publicUrl, preview, datasetTitle, error) =>
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
            Layer.mock(Datasets.Datasets, { getDatasetTitle: () => Effect.succeed(datasetTitle) }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
              getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            }),
            Layer.mock(Zenodo.Zenodo, {
              createRecordForDatasetReview: () => new Zenodo.FailedToCreateRecordForDatasetReview({}),
            }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.origin(),
    fc.constantFrom(
      new DatasetReviews.UnknownDatasetReview({}),
      new DatasetReviews.DatasetReviewIsInProgress(),
      new DatasetReviews.DatasetReviewHasBeenPublished(),
      new DatasetReviews.UnableToQuery({}),
    ),
  ])("when the data can't be generated", (datasetReviewId, publicUrl, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getDataForZenodoRecord: () => error }),
          Layer.mock(Datasets.Datasets, {}),
          Layer.mock(Personas.Personas, {}),
          Layer.mock(Zenodo.Zenodo, {}),
          Layer.succeed(PublicUrl, publicUrl),
        ),
      ),
      EffectTest.run,
    ),
  )
})
