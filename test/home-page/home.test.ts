import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/lib/Task.js'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../../src/feature-flags.js'
import * as _ from '../../src/home-page/index.js'
import { homeMatch } from '../../src/routes.js'
import * as fc from '../fc.js'

test.prop([fc.supportedLocale(), fc.option(fc.user(), { nil: undefined }), fc.boolean()])(
  'home',
  async (locale, user, canUserRequestReviews) => {
    const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)

    const actual = await _.home({ locale, user })({
      getRecentPrereviews: () => T.of([]),
      canRequestReviews,
      getRecentReviewRequests: () => T.of([]),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(homeMatch.formatter, {}),
      current: 'home',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(canRequestReviews).toHaveBeenCalledWith(user)
  },
)
