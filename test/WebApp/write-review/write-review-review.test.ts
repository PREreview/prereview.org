import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import {
  writeReviewMatch,
  writeReviewPublishMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
} from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewReview', () => {
  it.effect.prop(
    'can view the form',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.freeformForm(),
    ],
    ([preprintId, preprintTitle, body, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user, body, method })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['html-editor.js', 'editor-toolbar.js'],
        })
      }),
  )

  it.effect.prop(
    'when the form is completed',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.html().map(String),
      fc.user(),
      fc.supportedLocale(),
      fc.completedFreeformForm(),
    ],
    ([preprintId, preprintTitle, review, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user, body: { review }, method: 'POST' })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          review,
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
      fc.html().map(String),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteFreeformForm(),
    ],
    ([preprintId, preprintTitle, review, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user, body: { review }, method: 'POST' })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          review,
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
          _.writeReviewReview({ id: preprintId, user, locale, body, method })({
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
          _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
          _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user: undefined, body, method })({
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
    'without a review',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ review: fc.constant('') }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.freeformForm(),
    ],
    ([preprintId, preprintTitle, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user, body, method: 'POST' })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'],
        })
      }),
  )

  it.effect.prop(
    'when you said you want to answer questions',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.questionsForm(),
    ],
    ([preprintId, preprintTitle, body, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
    'without saying if you have already written the PREreview',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.unknownFormType(),
    ],
    ([preprintId, preprintTitle, body, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReview({ id: preprintId, locale, user, body, method })({
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
})
