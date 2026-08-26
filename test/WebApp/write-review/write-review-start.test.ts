import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import { writeReviewReviewTypeMatch, writeReviewStartMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewStart', () => {
  describe('when there is a session', () => {
    it.effect.prop(
      'there is a form',
      [fc.indeterminatePreprintId(), fc.preprint(), fc.form(), fc.user(), fc.supportedLocale()],
      ([preprintId, preprint, newReview, user, locale]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewStart({ id: preprintId, locale, user })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
    )

    it.effect.prop(
      "there isn't a form",
      [fc.indeterminatePreprintId(), fc.preprint(), fc.user(), fc.supportedLocale()],
      ([preprintId, preprint, user, locale]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewStart({ id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
    )

    it.effect.prop(
      'the user is an author',
      [
        fc.indeterminatePreprintId(),
        fc
          .user()
          .chain(user =>
            fc.tuple(
              fc.constant(user),
              fc.preprint({ authors: fc.tuple(fc.record({ name: fc.name(), orcid: fc.constant(user.orcid) })) }),
            ),
          ),
        fc.supportedLocale(),
        fc.option(fc.form(), { nil: undefined }),
      ],
      ([preprintId, [user, preprint], locale, newReview]) =>
        Effect.gen(function* () {
          const formStore = new Keyv()
          if (newReview) {
            yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))
          }

          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(
            _.writeReviewStart({ id: preprintId, locale, user })({ formStore, runtime }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
            status: StatusCodes.Forbidden,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
    )
  })

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale()],
    ([preprintId, preprint, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewStart({ id: preprintId, locale, user: undefined })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(writeReviewStartMatch.formatter, { id: preprint.id }),
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([preprintId, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewStart({ id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => new PreprintIsUnavailable({}) }))),
  )

  it.effect.prop(
    'when the preprint is not found',
    [fc.indeterminatePreprintId(), fc.option(fc.user(), { nil: undefined }), fc.supportedLocale()],
    ([preprintId, user, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.writeReviewStart({ id: preprintId, locale, user })({ formStore: new Keyv(), runtime }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => new PreprintIsNotFound({}) }))),
  )
})
