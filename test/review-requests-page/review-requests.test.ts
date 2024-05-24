import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/review-requests-page'
import { reviewRequestsMatch } from '../../src/routes'
import * as fc from '../fc'

describe('reviewRequests', () => {
  test.prop([
    fc.integer(),
    fc.record({
      currentPage: fc.integer(),
      totalPages: fc.integer(),
      reviewRequests: fc.nonEmptyArray(
        fc.record({
          fields: fc.array(fc.fieldId()),
          subfields: fc.array(fc.subfieldId()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    }),
  ])('when the requests can be loaded', async (page, reviewRequests) => {
    const actual = await _.reviewRequests({ page })({
      getReviewRequests: () => TE.right(reviewRequests),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewRequestsMatch.formatter, { page: reviewRequests.currentPage }),
      current: 'review-requests',
      status: Status.OK,
      title: expect.stringContaining('requests'),
      main: expect.stringContaining('requests'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.integer()])("when the requests can't be loaded", async page => {
    const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_ => TE.left('unavailable'))

    const actual = await _.reviewRequests({ page })({
      getReviewRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
    expect(getReviewRequests).toHaveBeenCalledWith(page)
  })

  test.prop([fc.integer()])("when the requests can't be found", async page => {
    const getReviewRequests = jest.fn<_.GetReviewRequestsEnv['getReviewRequests']>(_ => TE.left('not-found'))

    const actual = await _.reviewRequests({ page })({
      getReviewRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
    expect(getReviewRequests).toHaveBeenCalledWith(page)
  })
})
