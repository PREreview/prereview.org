import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import type { PopFromSessionEnv } from '../../../src/WebApp/session.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { PublishedReviewC } from '../../../src/WebApp/write-review/published-review.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewPublished', () => {
  it.effect.prop(
    'when the form is complete',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.origin(),
      fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([preprintId, preprintTitle, publicUrl, publishedReview, user, locale]) =>
      Effect.gen(function* () {
        const popFromSession = vi.fn<PopFromSessionEnv['popFromSession']>(_ =>
          TE.of(PublishedReviewC.encode(publishedReview)),
        )

        const actual = yield* Effect.promise(
          _.writeReviewPublished({ id: preprintId, locale, user })({
            getPreprintTitle: () => TE.right(preprintTitle),
            popFromSession,
            publicUrl,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(popFromSession).toHaveBeenCalledWith('published-review')
      }),
  )

  it.effect.prop(
    'when there is no published review',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.either(fc.constant('unavailable'), fc.json()),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([preprintId, preprintTitle, publishedReview, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPublished({ id: preprintId, locale, user })({
            getPreprintTitle: () => TE.right(preprintTitle),
            popFromSession: () => TE.fromEither(publishedReview),
            publicUrl: new URL('http://example.com'),
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
    [fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale()],
    ([preprintId, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPublished({ id: preprintId, locale, user })({
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            popFromSession: shouldNotBeCalled,
            publicUrl: new URL('http://example.com'),
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
    [fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale()],
    ([preprintId, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPublished({ id: preprintId, locale, user })({
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
            popFromSession: shouldNotBeCalled,
            publicUrl: new URL('http://example.com'),
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
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.supportedLocale()],
    ([preprintId, preprintTitle, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPublished({ id: preprintId, locale, user: undefined })({
            getPreprintTitle: () => TE.right(preprintTitle),
            popFromSession: shouldNotBeCalled,
            publicUrl: new URL('http://example.com'),
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
