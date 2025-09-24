import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/lib/Task.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/home-page/index.ts'
import { homeMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'

test.prop([fc.supportedLocale()])('home', async locale => {
  const actual = await _.home({ locale })({
    getRecentPrereviews: () => T.of([]),
    getRecentReviewRequests: () => T.of([]),
  })()

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    canonical: format(homeMatch.formatter, {}),
    current: 'home',
    status: StatusCodes.OK,
    title: expect.anything(),
    main: expect.anything(),
    skipToLabel: 'main',
    js: [],
  })
})
