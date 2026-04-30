import { describe, expect, it, test } from '@effect/vitest'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-prereviews-page/no-prereviews.ts'
import { myPrereviewsMatch } from '../../../src/routes.ts'
import * as fc from './fc.ts'

describe('ensureThereArePrereviews', () => {
  it.prop('when the list is not empty', [fc.nonEmptyArray(fc.localPrereview())], ([prereviews]) => {
    const actual = _.ensureThereArePrereviews(prereviews)

    expect(actual).toStrictEqual(E.right(prereviews))
  })

  test('when the list is empty', () => {
    const actual = _.ensureThereArePrereviews([])

    expect(actual).toStrictEqual(E.left(_.NoPrereviews))
  })
})

it.prop('toResponse', [fc.supportedLocale()], ([locale]) => {
  const actual = _.toResponse(_.NoPrereviews, locale)

  expect(actual).toStrictEqual({
    _tag: 'PageResponse',
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
    status: StatusCodes.OK,
    title: expect.anything(),
    main: expect.anything(),
    skipToLabel: 'main',
    js: [],
  })
})
