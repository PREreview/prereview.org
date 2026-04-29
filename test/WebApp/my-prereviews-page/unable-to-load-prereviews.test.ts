import { expect, it } from '@effect/vitest'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-prereviews-page/unable-to-load-prereviews.ts'
import * as fc from './fc.ts'

it.prop('toResponse', [fc.supportedLocale()], ([locale]) => {
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
