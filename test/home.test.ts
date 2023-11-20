import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as T from 'fp-ts/Task'
import { Status } from 'hyper-ts'
import * as _ from '../src/home'
import { homeMatch } from '../src/routes'

test('home', async () => {
  const actual = await _.home({
    getRecentPrereviews: () => T.of([]),
  })()

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    canonical: format(homeMatch.formatter, {}),
    current: 'home',
    status: Status.OK,
    title: expect.stringContaining('PREreview'),
    main: expect.anything(),
    js: [],
  })
})
