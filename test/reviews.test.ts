import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../src/reviews'
import { reviewsMatch } from '../src/routes'
import * as fc from './fc'

describe('reviews', () => {
  test.prop([
    fc.integer(),
    fc.record({
      currentPage: fc.integer(),
      totalPages: fc.integer(),
      recentPrereviews: fc.nonEmptyArray(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    }),
  ])('when the recent reviews can be loaded', async (page, recentPrereviews) => {
    const getRecentPrereviews = jest.fn<_.GetRecentPrereviewsEnv['getRecentPrereviews']>(_ =>
      TE.right(recentPrereviews),
    )

    const actual = await _.reviews(page)({ getRecentPrereviews })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewsMatch.formatter, { page: recentPrereviews.currentPage }),
      current: 'reviews',
      status: Status.OK,
      title: expect.stringContaining('PREreviews'),
      main: expect.stringContaining('PREreviews'),
      skipToLabel: 'main',
      js: [],
    })
    expect(getRecentPrereviews).toHaveBeenCalledWith(page)
  })

  test.prop([fc.integer()])('when the page is not found', async page => {
    const actual = await _.reviews(page)({ getRecentPrereviews: () => TE.left('not-found') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.integer()])('when the recent reviews cannot be loaded', async page => {
    const actual = await _.reviews(page)({ getRecentPrereviews: () => TE.left('unavailable') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })
})
