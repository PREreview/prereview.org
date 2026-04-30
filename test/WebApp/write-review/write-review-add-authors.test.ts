import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorMatch, writeReviewMatch, writeReviewPublishMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewAddAuthors', () => {
  describe("when there aren't more authors to add", () => {
    it.effect.prop(
      'when the form is completed',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.user(),
        fc.supportedLocale(),
        fc.completedForm({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) }),
      ],
      ([preprintId, preprintTitle, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() =>
            formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
          )

          const actual = yield* Effect.promise(
            _.writeReviewAddAuthors({
              id: preprintId,
              locale,
              method: 'POST',
              user,
            })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

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
        fc.user(),
        fc.supportedLocale(),
        fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
      ],
      ([preprintId, preprintTitle, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReviewAddAuthors({
              id: preprintId,
              locale,
              method: 'POST',
              user,
            })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          })
        }),
    )
  })

  it.effect.prop(
    'when there are no authors',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.form({ moreAuthors: fc.constantFrom('yes'), otherAuthors: fc.constantFrom([], undefined) }),
    ],
    ([preprintId, preprintTitle, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewAddAuthorMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
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
    'when there are no more authors',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
    ],
    ([preprintId, preprintTitle, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
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
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, method, user, locale]) =>
      Effect.gen(function* () {
        const getPreprintTitle = vi.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
          TE.left(new PreprintIsUnavailable({})),
        )

        const actual = yield* Effect.promise(
          _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
            formStore: new Keyv(),
            getPreprintTitle,
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
        expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewAddAuthors({ id: preprintId, locale, method, user })({
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
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewAddAuthors({ id: preprintId, locale, method })({
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
})
