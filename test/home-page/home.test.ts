import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/lib/Task.js'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags.js'
import * as _ from '../../src/home-page/index.js'
import { homeMatch } from '../../src/routes.js'
import * as fc from '../fc.js'

test.prop([fc.option(fc.user(), { nil: undefined }), fc.boolean(), fc.boolean()])(
  'home',
  async (user, canUserRequestReviews, canSeeGatesLogo) => {
    const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)

    const actual = await _.home({ user })({
      getRecentPrereviews: () => T.of([]),
      canRequestReviews,
      canSeeGatesLogo,
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
  },
)
