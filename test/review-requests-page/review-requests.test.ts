import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/review-requests-page/index.ts'
import { reviewRequestsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'

describe('reviewRequests', () => {
  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
    fc.record({
      currentPage: fc.integer(),
      totalPages: fc.integer(),
      field: fc.option(fc.fieldId(), { nil: undefined }),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      reviewRequests: fc.nonEmptyArray(
        fc.record({
          fields: fc.array(fc.fieldId()),
          subfields: fc.array(fc.subfieldId()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    }),
  ])('when the requests can be loaded', async (locale, page, field, language, reviewRequests) => {
    const actual = await _.reviewRequests({ field, language, locale, page })({
      getReviewRequests: () => TE.right(reviewRequests),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewRequestsMatch.formatter, {
        page: reviewRequests.currentPage,
        field: reviewRequests.field,
        language: reviewRequests.language,
      }),
      current: 'review-requests',
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      extraSkipLink: [expect.anything(), '#results'],
      js: [],
    })
  })

  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
  ])("when the requests can't be loaded", async (locale, page, field, language) => {
    const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_args =>
      TE.left(new _.ReviewRequestsAreUnavailable({})),
    )

    const actual = await _.reviewRequests({ field, language, locale, page })({
      getReviewRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getReviewRequests).toHaveBeenCalledWith({ field, language, page })
  })

  test.prop([
    fc.supportedLocale(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
  ])("when requests can't be found", async (locale, field, language) => {
    const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_args =>
      TE.left(new _.ReviewRequestsNotFound({})),
    )

    const actual = await _.reviewRequests({ field, language, locale, page: 1 })({
      getReviewRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewRequestsMatch.formatter, { page: 1, field, language }),
      current: 'review-requests',
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      extraSkipLink: [expect.anything(), '#results'],
      js: [],
    })
    expect(getReviewRequests).toHaveBeenCalledWith({ field, language, page: 1 })
  })

  test.prop([
    fc.supportedLocale(),
    fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 2 })),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
  ])("when the requests page can't be found", async (locale, page, field, language) => {
    const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_args =>
      TE.left(new _.ReviewRequestsNotFound({})),
    )

    const actual = await _.reviewRequests({ field, language, locale, page })({
      getReviewRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getReviewRequests).toHaveBeenCalledWith({ field, language, page })
  })
})
