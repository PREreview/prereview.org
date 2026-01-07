import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-prereviews-page/unable-to-load-prereviews.ts'
import * as fc from './fc.ts'

test.prop([fc.supportedLocale()])('toResponse', locale => {
  const actual = _.toResponse(_.UnableToLoadPrereviews, locale)

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    status: StatusCodes.ServiceUnavailable,
    title: expect.anything(),
    main: expect.anything(),
    skipToLabel: 'main',
    js: [],
  })
})
