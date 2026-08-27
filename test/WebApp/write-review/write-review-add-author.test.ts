import { describe, expect, it, vi } from '@effect/vitest'
import { Array, Effect, Layer, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/lib/Task.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewAddAuthor', () => {
  describe('when multiple authors can be added', () => {
    it.effect.prop(
      'when the form is completed',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.nonEmptyArray(fc.record({ name: fc.lorem(), emailAddress: fc.emailAddress() })).map(authors =>
          Tuple.make(
            {
              authors: Array.reduce(
                authors,
                '',
                (string, author) => `${string}\n${author.name} ${author.emailAddress}`,
              ),
            },
            authors,
          ),
        ),
        fc.user(),
        fc.supportedLocale(),
        fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors() }),
      ],
      ([id, preprintTitle, [body, expected], user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() =>
            formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
          )

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewAddAuthor({
              body,
              canAddMultipleAuthors: T.of(true),
              id,
              locale,
              method: 'POST',
              user,
            })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          })
          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
            otherAuthors: [...newReview.otherAuthors, ...expected],
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
    )

    it.effect.prop(
      'when the form is incomplete',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record({
          authors: fc
            .nonEmptyArray(fc.record({ name: fc.lorem(), emailAddress: fc.emailAddress() }))
            .map(Array.reduce('', (string, author) => `${string}\n${author.name} ${author.emailAddress}`)),
        }),
        fc.user(),
        fc.supportedLocale(),
        fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
      ],
      ([id, preprintTitle, body, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewAddAuthor({
              body,
              canAddMultipleAuthors: T.of(true),
              id,
              locale,
              method: 'POST',
              user,
            })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
    )
  })

  describe("when multiple authors can't be added", () => {
    it.effect.prop(
      'when the form is completed',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record({ name: fc.name(), emailAddress: fc.emailAddress() }),
        fc.user(),
        fc.supportedLocale(),
        fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors() }),
      ],
      ([id, preprintTitle, body, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() =>
            formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
          )

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewAddAuthor({
              body,
              canAddMultipleAuthors: T.of(false),
              id,
              locale,
              method: 'POST',
              user,
            })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          })
          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
            otherAuthors: [...newReview.otherAuthors, body],
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
    )

    it.effect.prop(
      'when the form is incomplete',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record({ name: fc.name(), emailAddress: fc.emailAddress() }),
        fc.user(),
        fc.supportedLocale(),
        fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
      ],
      ([id, preprintTitle, body, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewAddAuthor({
              body,
              canAddMultipleAuthors: T.of(false),
              id,
              locale,
              method: 'POST',
              user,
            })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
    )
  })

  it.effect.prop(
    'when there is no form',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.boolean().map(T.of),
    ],
    ([id, preprintTitle, body, method, user, locale, canAddMultipleAuthors]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
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
    'when there are no more authors',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.boolean().map(T.of),
      fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
    ],
    ([id, preprintTitle, body, method, user, locale, canAddMultipleAuthors, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({ formStore, runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }))),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale(), fc.boolean().map(T.of)],
    ([id, body, method, user, locale, canAddMultipleAuthors]) =>
      Effect.gen(function* () {
        const getPreprintTitle = vi.fn<(typeof Preprints.Service)['getPreprintTitle']>(
          _ => new PreprintIsUnavailable({}),
        )

        const runtime = yield* Effect.provide(Effect.runtime<Preprints>(), Layer.mock(Preprints, { getPreprintTitle }))

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
            formStore: new Keyv(),
            runtime,
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
        expect(getPreprintTitle).toHaveBeenCalledWith(id)
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale(), fc.boolean().map(T.of)],
    ([id, body, method, user, locale, canAddMultipleAuthors]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method, user })({
            formStore: new Keyv(),
            runtime,
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
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprintTitle: () => new PreprintIsNotFound({}) }))),
  )

  it.effect.prop(
    "when there isn't a session",
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.supportedLocale(),
      fc.boolean().map(T.of),
    ],
    ([id, preprintTitle, body, method, locale, canAddMultipleAuthors]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthor({ body, canAddMultipleAuthors, id, locale, method })({
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
})
