import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { GetPageFromGhostEnv } from '../src/GhostPage.js'
import * as _ from '../src/live-reviews.js'
import { liveReviewsMatch } from '../src/routes.js'
import * as fc from './fc.js'

describe('liveReviews', () => {
  test.prop([fc.supportedLocale(), fc.html()])('when the page can be loaded', async (locale, page) => {
    const getPageFromGhost = jest.fn<GetPageFromGhostEnv['getPageFromGhost']>(_ => TE.right(page))

    const actual = await _.liveReviews(locale)({ getPageFromGhost })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(liveReviewsMatch.formatter, {}),
      current: 'live-reviews',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPageFromGhost).toHaveBeenCalledWith('6154aa157741400e8722bb10')
  })

  test.prop([fc.supportedLocale(), fc.constantFrom('unavailable', 'not-found')])(
    'when the page cannot be loaded',
    async (locale, error) => {
      const actual = await _.liveReviews(locale)({ getPageFromGhost: () => TE.left(error) })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
