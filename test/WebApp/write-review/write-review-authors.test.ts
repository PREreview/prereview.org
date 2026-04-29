import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect } from 'vitest'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewMatch, writeReviewPublishMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewAuthors', () => {
  describe('when there are more authors', () => {
    it.effect.prop(
      'when they have read and agreed',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.constant({ moreAuthors: 'yes', moreAuthorsApproved: 'yes' }),
        fc.user(),
        fc.supportedLocale(),
        fc.form(),
      ],
      ([preprintId, preprintTitle, body, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
            moreAuthors: 'yes',
            moreAuthorsApproved: 'yes',
            otherAuthors: newReview.otherAuthors ?? [],
          })
          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          })
        }),
    )

    it.effect.prop(
      "when they haven't read and agreed",
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record(
          { moreAuthors: fc.constant('yes'), moreAuthorsApproved: fc.string() },
          { requiredKeys: ['moreAuthors'] },
        ),
        fc.user(),
        fc.supportedLocale(),
        fc.form(),
      ],
      ([preprintId, preprintTitle, body, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
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

    describe("when they don't want to be listed", () => {
      it.effect.prop(
        'when the form is completed',
        [
          fc.indeterminatePreprintId(),
          fc.preprintTitle(),
          fc.record(
            { moreAuthors: fc.constantFrom('yes-private'), moreAuthorsApproved: fc.moreAuthorsApproved() },
            { requiredKeys: ['moreAuthors'] },
          ),
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

            const actual = yield* Effect.promise(
              _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
                formStore,
                getPreprintTitle: () => TE.right(preprintTitle),
              }),
            )

            expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
              moreAuthors: 'yes-private',
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
          fc.record(
            { moreAuthors: fc.constant('yes-private'), moreAuthorsApproved: fc.moreAuthorsApproved() },
            { requiredKeys: ['moreAuthors'] },
          ),
          fc.user(),
          fc.supportedLocale(),
          fc.incompleteForm(),
        ],
        ([preprintId, preprintTitle, body, user, locale, newReview]) =>
          Effect.gen(function* () {
            const formStore = new Keyv()
            yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

            const actual = yield* Effect.promise(
              _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
                formStore,
                getPreprintTitle: () => TE.right(preprintTitle),
              }),
            )

            expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
              moreAuthors: 'yes-private',
            })
            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
            })
          }),
      )
    })
  })

  describe("when there aren't more authors", () => {
    it.effect.prop(
      'when the form is completed',
      [
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record(
          { moreAuthors: fc.constantFrom('no'), moreAuthorsApproved: fc.moreAuthorsApproved() },
          { requiredKeys: ['moreAuthors'] },
        ),
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

          const actual = yield* Effect.promise(
            _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
            moreAuthors: 'no',
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
        fc.record(
          { moreAuthors: fc.constant('no'), moreAuthorsApproved: fc.moreAuthorsApproved() },
          { requiredKeys: ['moreAuthors'] },
        ),
        fc.user(),
        fc.supportedLocale(),
        fc.incompleteForm(),
      ],
      ([preprintId, preprintTitle, body, user, locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
            }),
          )

          expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
            moreAuthors: 'no',
          })
          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          })
        }),
    )
  })

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewAuthors({ body, locale, method, id: preprintId, user })({
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
          _.writeReviewAuthors({ body, locale, method, id: preprintId, user })({
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
          _.writeReviewAuthors({ body, locale, method, id: preprintId, user })({
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
          _.writeReviewAuthors({ body, locale, method, id: preprintId, user: undefined })({
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
    'without a moreAuthors',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ moreAuthors: fc.string(), moreAuthorsApproved: fc.moreAuthorsApproved() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.form(),
    ],
    ([preprintId, preprintTitle, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewAuthors({ body, locale, method: 'POST', id: preprintId, user })({
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
})
