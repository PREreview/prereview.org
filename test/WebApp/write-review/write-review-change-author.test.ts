import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect, vi } from 'vitest'
import type { GetPreprintTitleEnv } from '../../../src/preprint.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewChangeAuthorMatch, writeReviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewChangeAuthor', () => {
  describe('when the form is submitted', () => {
    it.effect.prop(
      'when the form is valid',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.user(),
        fc.supportedLocale(),
        fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }),
        fc
          .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
          .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
      ],
      ([id, preprintTitle, user, locale, body, [newReview, number]]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReviewChangeAuthor({ body, id, locale, method: 'POST', number, user })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

          const otherAuthors = [...(newReview.otherAuthors ?? [])]
          otherAuthors.splice(number - 1, 1, body)

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          })
          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
            otherAuthors,
          })
        }),
    )

    it.effect.prop(
      'when the form is invalid',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.user(),
        fc.supportedLocale(),
        fc.oneof(
          fc.anything(),
          fc.record(
            {
              name: fc.anything().filter(value => typeof value !== 'string' || value === ''),
              emailAddress: fc.anything().filter(value => typeof value !== 'string' || !value.includes('@')),
            },
            { requiredKeys: [] },
          ),
        ),
        fc
          .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
          .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
      ],
      ([id, preprintTitle, user, locale, body, [newReview, number]]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReviewChangeAuthor({ body, id, locale, method: 'POST', number, user })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(writeReviewChangeAuthorMatch.formatter, { id: preprintTitle.id, number }),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
        }),
    )
  })

  it.effect.prop(
    'when the form needs submitting',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc
        .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
        .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
    ],
    ([id, preprintTitle, body, method, user, locale, [newReview, number]]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewChangeAuthorMatch.formatter, { id: preprintTitle.id, number }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  it.effect.prop(
    "when the number doesn't match",
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc
        .form({ moreAuthors: fc.constant('yes') })
        .chain(form =>
          fc.tuple(
            fc.constant(form),
            form.otherAuthors
              ? fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: form.otherAuthors.length + 1 }))
              : fc.integer(),
          ),
        ),
    ],
    ([id, preprintTitle, body, method, user, locale, [newReview, number]]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.integer(),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([id, preprintTitle, body, method, number, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
      fc.anything(),
      fc.string(),
      fc.integer(),
      fc.user(),
      fc.supportedLocale(),
      fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
    ],
    ([id, preprintTitle, body, method, number, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.integer(), fc.user(), fc.supportedLocale()],
    ([id, body, method, number, user, locale]) =>
      Effect.gen(function* () {
        const getPreprintTitle = vi.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ =>
          TE.left(new PreprintIsUnavailable({})),
        )

        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
        expect(getPreprintTitle).toHaveBeenCalledWith(id)
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.integer(), fc.user(), fc.supportedLocale()],
    ([id, body, method, number, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number, user })({
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
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.integer(), fc.supportedLocale()],
    ([id, preprintTitle, body, method, number, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewChangeAuthor({ body, id, locale, method, number })({
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
