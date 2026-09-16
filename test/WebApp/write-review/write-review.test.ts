import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import { writeReviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReview', () => {
  describe('when there is a session', () => {
    it.effect.prop(
      "the user isn't an author",
      [fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale(), fc.user()],
      ([preprintId, preprint, locale, user]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(_.writeReview({ id: preprintId, locale, user })({ runtime }))

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
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
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
              fc.preprint({ authors: fc.tuple(fc.record({ name: fc.name(), orcid: fc.constant(user.orcid) })) }),
            ),
          ),
      ],
      ([preprintId, locale, [user, preprint]]) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime<Preprints>()

          const actual = yield* Effect.promise(_.writeReview({ id: preprintId, locale, user })({ runtime }))

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
        }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
    )
  })

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprint(), fc.supportedLocale()],
    ([preprintId, preprint, locale]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(_.writeReview({ id: preprintId, locale, user: undefined })({ runtime }))

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
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([preprintId, locale, user]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(_.writeReview({ id: preprintId, locale, user })({ runtime }))

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
    [fc.indeterminatePreprintId(), fc.supportedLocale(), fc.option(fc.user(), { nil: undefined })],
    ([preprintId, locale, user]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(_.writeReview({ id: preprintId, locale, user })({ runtime }))

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
