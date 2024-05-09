import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-prereviews-page/unable-to-load-prereviews'

test('toResponse', () => {
  const actual = _.toResponse(_.UnableToLoadPrereviews)

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    status: Status.ServiceUnavailable,
    title: expect.stringContaining('problems'),
    main: expect.stringContaining('problems'),
    skipToLabel: 'main',
    js: [],
  })
})
