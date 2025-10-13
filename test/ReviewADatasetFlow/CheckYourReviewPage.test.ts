import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, Layer, Option, Tuple } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as DatasetReviews from '../../src/DatasetReviews/index.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import * as Personas from '../../src/Personas/index.ts'
import * as _ from '../../src/ReviewADatasetFlow/CheckYourReviewPage/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import type { Uuid } from '../../src/types/index.ts'
import { LoggedInUser } from '../../src/user.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CheckYourReviewPage', () => {
  describe('when the dataset review is by the user', () => {
    describe('when the dataset review is in progress', () => {
      test.prop([
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.datasetReviewPreview({
          author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant(Option.some('public')) }),
        }),
        fc.datasetTitle(),
        fc.publicPersona(),
      ])('with a public persona', (datasetReviewId, locale, user, preview, dataset, publicPersona) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => Effect.succeed(preview),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDatasetTitle: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provide(
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.datasetReviewPreview({
          author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant(Option.some('pseudonym')) }),
        }),
        fc.datasetTitle(),
        fc.pseudonymPersona(),
      ])('with a pseudonym persona', (datasetReviewId, locale, user, preview, dataset, pseudonymPersona) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => Effect.succeed(preview),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDatasetTitle: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provide(
            Layer.mock(Personas.Personas, {
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.datasetReviewPreview({
          author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant(Option.none()) }),
        }),
        fc.datasetTitle(),
      ])('without a persona', (datasetReviewId, locale, user, preview, dataset) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => Effect.succeed(preview),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDatasetTitle: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.datasetReviewPreview(),
      fc
        .tuple(fc.anything(), fc.datasetId())
        .chain(([cause, datasetId]) =>
          fc.constantFrom(
            new Datasets.DatasetIsNotFound({ cause, datasetId }),
            new Datasets.DatasetIsUnavailable({ cause, datasetId }),
          ),
        ),
      fc.publicPersona(),
      fc.pseudonymPersona(),
    ])(
      "when the dataset can't be loaded",
      (datasetReviewId, locale, user, preview, error, publicPersona, pseudonymPersona) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => Effect.succeed(preview),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDatasetTitle: () => error,
            }),
          ),
          Effect.provide(
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.datasetReviewPreview({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.some(fc.constantFrom('public', 'pseudonym')) }),
      }),
      fc.datasetTitle(),
      fc.anything(),
    ])("when the persona can't be loaded", (datasetReviewId, locale, user, preview, dataset, error) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => Effect.succeed(user.orcid),
            getPreviewForAReviewReadyToBePublished: () => Effect.succeed(preview),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDatasetTitle: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom<
        Array<
          [DatasetReviews.DatasetReviewNotReadyToBePublished['missing'], Routes.Route<{ datasetReviewId: Uuid.Uuid }>]
        >
      >(
        Tuple.make(
          ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples', 'AnsweredIfTheDatasetHasEnoughMetadata'],
          Routes.ReviewADatasetFollowsFairAndCarePrinciples,
        ),
        Tuple.make(['AnsweredIfTheDatasetHasEnoughMetadata'], Routes.ReviewADatasetHasEnoughMetadata),
      ),
    ])("when the dataset review isn't ready to be published", (datasetReviewId, locale, user, [missing, expected]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expected.href({ datasetReviewId }),
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => Effect.succeed(user.orcid),
            getPreviewForAReviewReadyToBePublished: () =>
              new DatasetReviews.DatasetReviewNotReadyToBePublished({ missing }),
          }),
        ),
        Effect.provide(Layer.mock(Datasets.Datasets, {})),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is being published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ),
          Effect.provide(Layer.mock(Datasets.Datasets, {})),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review has been published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPreviewForAReviewReadyToBePublished: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
            }),
          ),
          Effect.provide(Layer.mock(Datasets.Datasets, {})),
          Effect.provide(Layer.mock(Personas.Personas, {})),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.supportedLocale(),
    fc
      .tuple(fc.user(), fc.orcidId())
      .filter(([user, datasetReviewAuthor]) => !Equal.equals(user.orcid, datasetReviewAuthor)),
  ])('when the dataset review is by a different user', (datasetReviewId, locale, [user, datasetReviewAuthor]) =>
    Effect.gen(function* () {
      const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(datasetReviewAuthor) }),
      ),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => new DatasetReviews.UnknownDatasetReview({}),
          }),
        ),
        Effect.provide(Layer.mock(Datasets.Datasets, {})),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => new DatasetReviews.UnableToQuery({}) }),
        ),
        Effect.provide(Layer.mock(Datasets.Datasets, {})),
        Effect.provide(Layer.mock(Personas.Personas, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})

describe('CheckYourReviewSubmission', () => {
  describe('when the form is submitted', () => {
    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the review can be published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { publishDatasetReview: () => Effect.void })),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(user.orcid) }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewNotReadyToBePublished({
          missing: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
        }),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the review can't be published", (datasetReviewId, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewCommands, { publishDatasetReview: () => Effect.fail(error) }),
        ),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(user.orcid) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.supportedLocale(),
    fc
      .tuple(fc.user(), fc.orcidId())
      .filter(([user, datasetReviewAuthor]) => !Equal.equals(user.orcid, datasetReviewAuthor)),
  ])('when the dataset review is by a different user', (datasetReviewId, locale, [user, datasetReviewAuthor]) =>
    Effect.gen(function* () {
      const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(datasetReviewAuthor) }),
      ),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => new DatasetReviews.UnknownDatasetReview({}),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourReviewSubmission({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => new DatasetReviews.UnableToQuery({}) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})
