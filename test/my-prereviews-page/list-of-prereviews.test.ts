import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-prereviews-page/list-of-prereviews'
import { myPrereviewsMatch } from '../../src/routes'
import * as fc from './fc'

test.prop([fc.nonEmptyArray(fc.prereview())])('toResponse', prereviews => {
  const actual = _.toResponse(_.ListOfPrereviews(prereviews))

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    canonical: format(myPrereviewsMatch.formatter, {}),
    status: Status.OK,
    title: expect.stringContaining('My PREreviews'),
    main: expect.stringContaining('My PREreviews'),
    skipToLabel: 'main',
    js: [],
  })
})
