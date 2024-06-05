import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { html } from '../../src/html'
import * as _ from '../../src/reviews-page'
import { reviewsMatch } from '../../src/routes'
import * as fc from '../fc'

describe('reviewsPage', () => {
  test.prop([
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.record({
      currentPage: fc.integer(),
      totalPages: fc.integer(),
      field: fc.option(fc.fieldId(), { nil: undefined }),
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
  ])('when the recent reviews can be loaded', async (page, field, recentPrereviews) => {
    const getRecentPrereviews = jest.fn<_.GetRecentPrereviewsEnv['getRecentPrereviews']>(_ =>
      TE.right(recentPrereviews),
    )

    const actual = await _.reviewsPage({ field, page })({ getRecentPrereviews })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewsMatch.formatter, { page: recentPrereviews.currentPage, field: recentPrereviews.field }),
      current: 'reviews',
      status: Status.OK,
      title: expect.stringContaining('PREreviews'),
      main: expect.stringContaining('PREreviews'),
      skipToLabel: 'main',
      extraSkipLink: [html`Skip to results`, '#results'],
      js: [],
    })
    expect(getRecentPrereviews).toHaveBeenCalledWith({ field, page })
  })

  test.prop([fc.option(fc.fieldId(), { nil: undefined })])('when there are no reviews', async field => {
    const actual = await _.reviewsPage({ field, page: 1 })({ getRecentPrereviews: () => TE.left('not-found') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewsMatch.formatter, { page: 1, field }),
      current: 'reviews',
      status: Status.OK,
      title: expect.stringContaining('PREreviews'),
      main: expect.stringContaining('PREreviews'),
      skipToLabel: 'main',
      extraSkipLink: [html`Skip to results`, '#results'],
      js: [],
    })
  })

  test.prop([fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 2 })), fc.option(fc.fieldId(), { nil: undefined })])(
    'when the page is not found',
    async (page, field) => {
      const actual = await _.reviewsPage({ field, page })({ getRecentPrereviews: () => TE.left('not-found') })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.integer(), fc.option(fc.fieldId(), { nil: undefined })])(
    'when the recent reviews cannot be loaded',
    async (page, field) => {
      const actual = await _.reviewsPage({ field, page })({ getRecentPrereviews: () => TE.left('unavailable') })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
