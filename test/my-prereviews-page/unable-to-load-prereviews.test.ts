import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-prereviews-page/unable-to-load-prereviews.js'

test('toResponse', () => {
  const actual = _.toResponse(_.UnableToLoadPrereviews)

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    status: Status.ServiceUnavailable,
    title: expect.anything(),
    main: expect.anything(),
    skipToLabel: 'main',
    js: [],
  })
})
