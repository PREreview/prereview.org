import { it } from '@effect/vitest'
import { Effect, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect } from 'vitest'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewResultsSupported', () => {
  it.effect.prop(
    'when the form is completed',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.tuple(fc.resultsSupported(), fc.resultsSupportedDetails()).map(([resultsSupported, resultsSupportedDetails]) =>
        Tuple.make(resultsSupported, resultsSupportedDetails, {
          resultsSupported,
          resultsSupportedNotSupportedDetails: resultsSupportedDetails['not-supported'],
          resultsSupportedPartiallySupportedDetails: resultsSupportedDetails['partially-supported'],
          resultsSupportedNeutralDetails: resultsSupportedDetails.neutral,
          resultsSupportedWellSupportedDetails: resultsSupportedDetails['well-supported'],
          resultsSupportedStronglySupportedDetails: resultsSupportedDetails['strongly-supported'],
        }),
      ),
      fc.user(),
      fc.supportedLocale(),
      fc.completedQuestionsForm(),
    ],
    ([preprintId, preprintTitle, [resultsSupported, resultsSupportedDetails, body], user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() =>
          formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
        )

        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method: 'POST', id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          resultsSupported,
          resultsSupportedDetails,
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when the form is incomplete',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.tuple(fc.resultsSupported(), fc.resultsSupportedDetails()).map(([resultsSupported, resultsSupportedDetails]) =>
        Tuple.make(resultsSupported, resultsSupportedDetails, {
          resultsSupported,
          resultsSupportedNotSupportedDetails: resultsSupportedDetails['not-supported'],
          resultsSupportedPartiallySupportedDetails: resultsSupportedDetails['partially-supported'],
          resultsSupportedNeutralDetails: resultsSupportedDetails.neutral,
          resultsSupportedWellSupportedDetails: resultsSupportedDetails['well-supported'],
          resultsSupportedStronglySupportedDetails: resultsSupportedDetails['strongly-supported'],
        }),
      ),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteQuestionsForm(),
    ],
    ([preprintId, preprintTitle, [resultsSupported, resultsSupportedDetails, body], user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method: 'POST', id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          resultsSupported,
          resultsSupportedDetails,
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method, id: preprintId, user })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method, id: preprintId, user })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method, id: preprintId, user })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'without saying if the results are supported by the data',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ resultsSupported: fc.lorem() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.questionsForm(),
    ],
    ([preprintId, preprintTitle, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method: 'POST', id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['conditional-inputs.js', 'error-summary.js'],
        })
      }),
  )

  it.effect.prop(
    "when you haven't said you want to answer questions",
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.oneof(fc.freeformForm(), fc.constant({})),
    ],
    ([preprintId, preprintTitle, body, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method, id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, locale]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()

        const actual = yield* Effect.promise(
          _.writeReviewResultsSupported({ body, locale, method, id: preprintId, user: undefined })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )
})
