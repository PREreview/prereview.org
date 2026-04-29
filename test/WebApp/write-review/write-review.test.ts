import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect } from 'vitest'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewStartMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReview', () => {
  describe('when there is a session', () => {
    it.effect.prop(
      'there is a form already',
      [fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale(), fc.form(), fc.user()],
      ([preprintId, preprint, locale, newReview, user]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))

          const actual = yield* Effect.promise(
            _.writeReview({ id: preprintId, locale, user })({
              formStore,
              getPreprint: () => TE.right(preprint),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewStartMatch.formatter, { id: preprint.id }),
          })
        }),
    )

    it.effect.prop(
      "there isn't a form",
      [fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale(), fc.user()],
      ([preprintId, preprint, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.writeReview({ id: preprintId, locale, user })({
              formStore: new Keyv(),
              getPreprint: () => TE.right(preprint),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'the user is an author',
      [
        fc.indeterminatePreprintId(),
        fc.supportedLocale(),
        fc
          .user()
          .chain(user =>
            fc.tuple(
              fc.constant(user),
              fc.preprint({ authors: fc.tuple(fc.record({ name: fc.string(), orcid: fc.constant(user.orcid) })) }),
            ),
          ),
      ],
      ([preprintId, locale, [user, preprint]]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.writeReview({ id: preprintId, locale, user })({
              formStore: new Keyv(),
              getPreprint: () => TE.right(preprint),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
            status: StatusCodes.Forbidden,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )
  })

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale()],
    ([preprintId, preprint, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReview({ id: preprintId, locale, user: undefined })({
            formStore: new Keyv(),
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([preprintId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReview({ id: preprintId, locale, user })({
            formStore: new Keyv(),
            getPreprint: () => TE.left(new PreprintIsUnavailable({})),
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
    'when the preprint is not found',
    [fc.indeterminatePreprintId(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([preprintId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReview({ id: preprintId, locale, user })({
            formStore: new Keyv(),
            getPreprint: () => TE.left(new PreprintIsNotFound({})),
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
})
