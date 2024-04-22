import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/Task'
import { Status } from 'hyper-ts'
import type { CanRequestReviewsEnv } from '../src/feature-flags'
import * as _ from '../src/home'
import { homeMatch } from '../src/routes'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('home', () => {
  test.prop([fc.user(), fc.boolean()])('when the user is logged in', async (user, canUserRequestReviews) => {
    const canRequestReviews = jest.fn<CanRequestReviewsEnv['canRequestReviews']>(_ => canUserRequestReviews)

    const actual = await _.home({ user })({
      getRecentPrereviews: () => T.of([]),
      canRequestReviews,
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

  test('when the user is not logged in', async () => {
    const actual = await _.home({})({
      getRecentPrereviews: () => T.of([]),
      canRequestReviews: shouldNotBeCalled,
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
  })
})
