import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-prereviews-page/unable-to-load-prereviews.js'
import * as fc from './fc.js'

test.prop([fc.supportedLocale()])('toResponse', locale => {
  const actual = _.toResponse(_.UnableToLoadPrereviews, locale)

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    status: Status.ServiceUnavailable,
    title: expect.anything(),
    main: expect.anything(),
    skipToLabel: 'main',
    js: [],
  })
})
