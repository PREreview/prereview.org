import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-prereviews-page/list-of-prereviews.js'
import { myPrereviewsMatch } from '../../src/routes.js'
import * as fc from './fc.js'

test.prop([fc.nonEmptyArray(fc.prereview()), fc.user()])('toResponse', (prereviews, user) => {
  const actual = _.toResponse(_.ListOfPrereviews({ prereviews, user }))

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
    status: Status.OK,
    title: expect.stringContaining('My PREreviews'),
    main: expect.stringContaining('My PREreviews'),
    skipToLabel: 'main',
    js: [],
  })
})
