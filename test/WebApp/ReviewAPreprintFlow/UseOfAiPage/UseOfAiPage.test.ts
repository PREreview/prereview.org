import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Layer, Option } from 'effect'
import { format } from 'fp-ts-routing'
import { UnableToHandleCommand } from '../../../../src/Commands.ts'
import { Locale } from '../../../../src/Context.ts'
import { html } from '../../../../src/html.ts'
import { DefaultLocale } from '../../../../src/locales/index.ts'
import * as PreprintReviews from '../../../../src/PreprintReviews/index.ts'
import {
  BiorxivPreprintId,
  PreprintIsNotFound,
  PreprintIsUnavailable,
  Preprints,
  type PreprintTitle,
} from '../../../../src/Preprints/index.ts'
import { UnableToQuery } from '../../../../src/Queries.ts'
import * as Routes from '../../../../src/routes.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import { HavingProblemsPage } from '../../../../src/WebApp/HavingProblemsPage/index.ts'
import { PageNotFound } from '../../../../src/WebApp/PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../../../src/WebApp/Response/index.ts'
import { RouteForCommand } from '../../../../src/WebApp/ReviewAPreprintFlow/RouteForCommand.ts'
import * as _ from '../../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/index.ts'
import * as UseOfAiForm from '../../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/UseOfAiForm.ts'
import { renderUseOfAiPage } from '../../../../src/WebApp/ReviewAPreprintFlow/UseOfAiPage/UseOfAiPage.ts'
import * as fc from '../../../fc.ts'

describe('UseOfAiPage', () => {
  it.effect.prop(
    'shows the review’s answer',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), useOfAiDetails()],
    ([preprintId, preprint, user, locale, details]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ preprintId })

        expect(actual).toStrictEqual(
          renderUseOfAiPage({
            alreadyWritten: details.alreadyWritten,
            form: UseOfAiForm.fromAnswer(
              Option.map(details.generativeAiIdeas, answer => ({ answer, detail: details.generativeAiIdeasDetails })),
            ),
            locale,
            moreAuthors: details.moreAuthors,
            preprint,
          }),
        )
      }).pipe(
        Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprint) })),
        Effect.provide(
          Layer.mock(PreprintReviews.PreprintReviews, { getUseOfAiDetails: () => Effect.succeed(details) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
      ),
  )

  it.effect.each<
    [string, Layer.Layer<Preprints | PreprintReviews.PreprintReviews>, Effect.Effect<Response, never, Locale>]
  >([
    ['preprint not found', services({ getPreprintTitle: () => new PreprintIsNotFound({}) }, {}), PageNotFound],
    [
      'preprint unavailable',
      services({ getPreprintTitle: () => new PreprintIsUnavailable({}) }, {}),
      HavingProblemsPage,
    ],
    [
      'no review in progress',
      services(foundPreprint, { getUseOfAiDetails: () => new PreprintReviews.PreprintReviewNotFound({}) }),
      redirectToStart,
    ],
    [
      'review unavailable',
      services(foundPreprint, { getUseOfAiDetails: () => new UnableToQuery({}) }),
      HavingProblemsPage,
    ],
  ])('when %s', ([, layer, expected]) =>
    Effect.gen(function* () {
      const actual = yield* _.UseOfAiPage({ preprintId: preprint.id })

      expect(actual).toStrictEqual(yield* expected)
    }).pipe(
      Effect.provide(layer),
      Effect.provideService(Locale, DefaultLocale),
      Effect.provideService(LoggedInUser, user),
    ),
  )
})

describe('UseOfAiSubmission', () => {
  it.effect.prop(
    'when the answer is valid, it is saved',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.user(),
      fc.supportedLocale(),
      fc.oneof(
        fc.record({
          generativeAiIdeas: fc.constant('yes' as const),
          generativeAiIdeasDetails: fc.maybe(fc.nonEmptyString()),
        }),
        fc.record({
          generativeAiIdeas: fc.constant('no' as const),
          generativeAiIdeasDetails: fc.constant(Option.none()),
        }),
      ),
      fc.constantFrom('DeclareCompetingInterests', 'DeclareFollowingCodeOfConduct', 'PublishPreprintReview'),
    ],
    ([preprintId, preprint, user, locale, { generativeAiIdeas, generativeAiIdeasDetails }, nextExpectedCommand]) => {
      const declarations: Array<Parameters<PreprintReviews.PreprintReviews['Type']['declareUseOfAi']>[0]> = []

      return Effect.gen(function* () {
        const actual = yield* _.UseOfAiSubmission({
          body: UrlParams.fromInput({
            generativeAiIdeas,
            generativeAiIdeasDetails: Option.getOrUndefined(generativeAiIdeasDetails),
          }),
          preprintId,
        })

        expect(declarations).toStrictEqual([
          { preprintId: preprint.id, orcidId: user.orcid, generativeAiIdeas, generativeAiIdeasDetails },
        ])
        expect(actual).toStrictEqual(
          RedirectResponse({ location: RouteForCommand(nextExpectedCommand).href({ preprintId: preprint.id }) }),
        )
      }).pipe(
        Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprint) })),
        Effect.provide(
          Layer.mock(PreprintReviews.PreprintReviews, {
            declareUseOfAi: input => Effect.sync(() => void declarations.push(input)),
            getNextExpectedCommand: () => Effect.succeed(nextExpectedCommand),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
      )
    },
  )

  it.effect.prop(
    'when the answer is missing, it shows an error',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), useOfAiDetails()],
    ([preprintId, preprint, user, locale, details]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiSubmission({ body: UrlParams.empty, preprintId })

        expect(actual).toStrictEqual(
          renderUseOfAiPage({
            alreadyWritten: details.alreadyWritten,
            form: new UseOfAiForm.InvalidForm({
              generativeAiIdeas: Either.left(new UseOfAiForm.Missing()),
              generativeAiIdeasDetails: Option.none(),
            }),
            locale,
            moreAuthors: details.moreAuthors,
            preprint,
          }),
        )
      }).pipe(
        Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprint) })),
        Effect.provide(
          Layer.mock(PreprintReviews.PreprintReviews, { getUseOfAiDetails: () => Effect.succeed(details) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
      ),
  )

  it.effect.each<
    [
      string,
      UrlParams.UrlParams,
      Layer.Layer<Preprints | PreprintReviews.PreprintReviews>,
      Effect.Effect<Response, never, Locale>,
    ]
  >([
    [
      'preprint not found',
      validBody,
      services({ getPreprintTitle: () => new PreprintIsNotFound({}) }, {}),
      PageNotFound,
    ],
    [
      'preprint unavailable',
      validBody,
      services({ getPreprintTitle: () => new PreprintIsUnavailable({}) }, {}),
      HavingProblemsPage,
    ],
    [
      'no review in progress',
      validBody,
      services(foundPreprint, { declareUseOfAi: () => new PreprintReviews.PreprintReviewNotFound({}) }),
      redirectToStart,
    ],
    [
      'answer cannot be saved',
      validBody,
      services(foundPreprint, { declareUseOfAi: () => new UnableToHandleCommand({}) }),
      HavingProblemsPage,
    ],
    [
      'next step unavailable',
      validBody,
      services(foundPreprint, {
        declareUseOfAi: () => Effect.void,
        getNextExpectedCommand: () => new UnableToQuery({}),
      }),
      HavingProblemsPage,
    ],
    [
      'answer is missing and no review in progress',
      UrlParams.empty,
      services(foundPreprint, { getUseOfAiDetails: () => new PreprintReviews.PreprintReviewNotFound({}) }),
      redirectToStart,
    ],
    [
      'answer is missing and review unavailable',
      UrlParams.empty,
      services(foundPreprint, { getUseOfAiDetails: () => new UnableToQuery({}) }),
      HavingProblemsPage,
    ],
  ])('when %s', ([, body, layer, expected]) =>
    Effect.gen(function* () {
      const actual = yield* _.UseOfAiSubmission({ body, preprintId: preprint.id })

      expect(actual).toStrictEqual(yield* expected)
    }).pipe(
      Effect.provide(layer),
      Effect.provideService(Locale, DefaultLocale),
      Effect.provideService(LoggedInUser, user),
    ),
  )
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const user = { orcid: OrcidId('0000-0002-1825-0097') }

const validBody = UrlParams.fromInput({ generativeAiIdeas: 'yes' })

const foundPreprint = { getPreprintTitle: () => Effect.succeed(preprint) }

const redirectToStart = Effect.succeed(
  RedirectResponse({ location: format(Routes.writeReviewMatch.formatter, { id: preprint.id }) }),
)

function services(
  preprints: Partial<Preprints['Type']>,
  preprintReviews: Partial<PreprintReviews.PreprintReviews['Type']>,
): Layer.Layer<Preprints | PreprintReviews.PreprintReviews> {
  return Layer.merge(Layer.mock(Preprints, preprints), Layer.mock(PreprintReviews.PreprintReviews, preprintReviews))
}

function useOfAiDetails(): fc.Arbitrary<
  Effect.Effect.Success<ReturnType<PreprintReviews.PreprintReviews['Type']['getUseOfAiDetails']>>
> {
  return fc.record({
    generativeAiIdeas: fc.maybe(fc.constantFrom('yes', 'no')),
    generativeAiIdeasDetails: fc.maybe(fc.nonEmptyString()),
    moreAuthors: fc.constantFrom('yes', 'yes-private', 'no', undefined),
    alreadyWritten: fc.constantFrom('yes', 'no', undefined),
  })
}
