import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewUseOfAiMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewUseOfAi', () => {
  it.effect.prop(
    'when there is a form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), fc.form()],
    ([preprintId, preprintTitle, user, locale, form]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form)))

        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAi({ id: preprintId, locale, user })({ formStore, runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    "when there isn't a form",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAi({ id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.supportedLocale()],
    ([preprintId, preprintTitle, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAi({ id: preprintId, locale, user: undefined })({ formStore: new Keyv(), runtime }),
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
    [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([preprintId, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAi({ id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
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
    'when the preprint is not found',
    [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([preprintId, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAi({ id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
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
})

describe('writeReviewUseOfAiSubmission', () => {
  describe('when there is a form', () => {
    it.effect.prop(
      'when the form is completed',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.user(),
        fc.record({ generativeAiIdeas: fc.constantFrom('yes', 'no') }),
        fc.supportedLocale(),
        fc.completedForm(),
      ],
      ([preprintId, preprintTitle, user, body, locale, form]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() =>
            formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(form))),
          )

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({ formStore, runtime }),
          )

          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject(body)
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
        fc.user(),
        fc.record({ generativeAiIdeas: fc.constantFrom('yes', 'no') }),
        fc.supportedLocale(),
        fc.incompleteForm(),
      ],
      ([preprintId, preprintTitle, user, body, locale, form]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form)))

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({ formStore, runtime }),
          )

          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject(body)
          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
    )

    it.effect.prop(
      'without declare the use of AI',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.user(),
        fc.oneof(
          fc.record({ generativeAiIdeas: fc.string().filter(s => !['yes', 'no'].includes(s)) }, { requiredKeys: [] }),
          fc.anything(),
        ),
        fc.supportedLocale(),
        fc.incompleteForm(),
      ],
      ([preprintId, preprintTitle, user, body, locale, form]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form)))

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprintTitle.id }),
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

  it.effect.prop(
    "when there isn't a form",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.anything(), fc.supportedLocale()],
    ([preprintId, preprintTitle, user, body, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user: undefined })({
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
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale(), fc.anything()],
    ([preprintId, user, locale, body]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
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
    'when the preprint is not found',
    [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale(), fc.anything()],
    ([preprintId, user, locale, body]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
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
})
