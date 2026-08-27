import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewConduct', () => {
  it.effect.prop(
    'when the form is completed',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ conduct: fc.conduct() }),
      fc.user(),
      fc.supportedLocale(),
      fc.completedForm(),
    ],
    ([preprintId, preprintTitle, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() =>
          formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
        )

        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method: 'POST', id: preprintId, user })({ formStore, runtime }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          conduct: 'yes',
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    'when the form is incomplete',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ conduct: fc.conduct() }),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteForm(),
    ],
    ([preprintId, preprintTitle, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method: 'POST', id: preprintId, user })({ formStore, runtime }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          conduct: 'yes',
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method, id: preprintId, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method, id: preprintId, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => new PreprintIsUnavailable({}) }))),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method, id: preprintId, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => new PreprintIsNotFound({}) }))),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method, id: preprintId, user: undefined })({
            formStore: new Keyv(),
            runtime,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    'without agreement to the Code of Conduct',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ conduct: fc.string() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.form(),
    ],
    ([preprintId, preprintTitle, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewConduct({ body, locale, method: 'POST', id: preprintId, user })({ formStore, runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )
})
