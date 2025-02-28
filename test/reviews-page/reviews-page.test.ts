import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/reviews-page/index.js'
import { reviewsMatch } from '../../src/routes.js'
import * as fc from '../fc.js'

describe('reviewsPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.nonEmptyString(), { nil: undefined }),
    fc.record({
      currentPage: fc.integer(),
      totalPages: fc.integer(),
      field: fc.option(fc.fieldId(), { nil: undefined }),
      query: fc.option(fc.nonEmptyString(), { nil: undefined }),
      recentPrereviews: fc.nonEmptyArray(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          fields: fc.array(fc.fieldId()),
          subfields: fc.array(fc.subfieldId()),
          preprint: fc.preprintTitle(),
        }),
      ),
    }),
  ])('when the recent reviews can be loaded', async (locale, page, field, query, recentPrereviews) => {
    const getRecentPrereviews = jest.fn<_.GetRecentPrereviewsEnv['getRecentPrereviews']>(_ =>
      TE.right(recentPrereviews),
    )

    const actual = await _.reviewsPage({ field, locale, page, query })({ getRecentPrereviews })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewsMatch.formatter, {
        page: recentPrereviews.currentPage,
        field: recentPrereviews.field,
        query: recentPrereviews.query,
      }),
      current: 'reviews',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      extraSkipLink: [expect.anything(), '#results'],
      js: [],
    })
    expect(getRecentPrereviews).toHaveBeenCalledWith({ field, page, query })
  })

  test.prop([
    fc.supportedLocale(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.nonEmptyString(), { nil: undefined }),
  ])('when there are no reviews', async (locale, field, query) => {
    const actual = await _.reviewsPage({ field, locale, page: 1, query })({
      getRecentPrereviews: () => TE.left('not-found'),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewsMatch.formatter, { page: 1, field, query }),
      current: 'reviews',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      extraSkipLink: [expect.anything(), '#results'],
      js: [],
    })
  })

  test.prop([
    fc.supportedLocale(),
    fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 2 })),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.nonEmptyString(), { nil: undefined }),
  ])('when the page is not found', async (locale, page, field, query) => {
    const actual = await _.reviewsPage({ field, locale, page, query })({
      getRecentPrereviews: () => TE.left('not-found'),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.nonEmptyString(), { nil: undefined }),
  ])('when the recent reviews cannot be loaded', async (locale, page, field, query) => {
    const actual = await _.reviewsPage({ field, locale, page, query })({
      getRecentPrereviews: () => TE.left('unavailable'),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
