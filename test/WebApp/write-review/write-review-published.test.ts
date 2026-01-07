import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch } from '../../../src/routes.ts'
import type { PopFromSessionEnv } from '../../../src/session.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { PublishedReviewC } from '../../../src/WebApp/write-review/published-review.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewPublished', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.origin(),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
    fc.supportedLocale(),
  ])('when the form is complete', async (preprintId, preprintTitle, publicUrl, publishedReview, user, locale) => {
    const popFromSession = jest.fn<PopFromSessionEnv['popFromSession']>(_ =>
      TE.of(PublishedReviewC.encode(publishedReview)),
    )

    const actual = await _.writeReviewPublished({ id: preprintId, locale, user })({
      getPreprintTitle: () => TE.right(preprintTitle),
      popFromSession,
      publicUrl,
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(popFromSession).toHaveBeenCalledWith('published-review')
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.either(fc.constant('unavailable'), fc.json()),
    fc.user(),
    fc.supportedLocale(),
  ])('when there is no published review', async (preprintId, preprintTitle, publishedReview, user, locale) => {
    const actual = await _.writeReviewPublished({ id: preprintId, locale, user })({
      getPreprintTitle: () => TE.right(preprintTitle),
      popFromSession: () => TE.fromEither(publishedReview),
      publicUrl: new URL('http://example.com'),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, locale) => {
      const actual = await _.writeReviewPublished({ id: preprintId, locale, user })({
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        popFromSession: shouldNotBeCalled,
        publicUrl: new URL('http://example.com'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, user, locale) => {
      const actual = await _.writeReviewPublished({ id: preprintId, locale, user })({
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
        popFromSession: shouldNotBeCalled,
        publicUrl: new URL('http://example.com'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, locale) => {
      const actual = await _.writeReviewPublished({ id: preprintId, locale, user: undefined })({
        getPreprintTitle: () => TE.right(preprintTitle),
        popFromSession: shouldNotBeCalled,
        publicUrl: new URL('http://example.com'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )
})
