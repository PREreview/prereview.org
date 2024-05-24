import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/Task'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags'
import * as _ from '../../src/home-page'
import { homeMatch } from '../../src/routes'
import * as fc from '../fc'

test.prop([fc.option(fc.user(), { nil: undefined }), fc.boolean()])('home', async (user, canUserRequestReviews) => {
  const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)

  const actual = await _.home({ user })({
    getRecentPrereviews: () => T.of([]),
    canRequestReviews,
    getRecentReviewRequests: () => T.of([]),
  })()

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    canonical: format(homeMatch.formatter, {}),
    current: 'home',
    status: Status.OK,
    title: expect.stringContaining('PREreview'),
    main: expect.anything(),
    skipToLabel: 'main',
    js: [],
  })
  expect(canRequestReviews).toHaveBeenCalledWith(user)
})
