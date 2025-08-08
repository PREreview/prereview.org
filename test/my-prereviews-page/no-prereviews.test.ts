import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import * as _ from '../../src/my-prereviews-page/no-prereviews.js'
import { myPrereviewsMatch } from '../../src/routes.js'
import * as fc from './fc.js'

describe('ensureThereArePrereviews', () => {
  test.prop([fc.nonEmptyArray(fc.localPrereview())])('when the list is not empty', prereviews => {
    const actual = _.ensureThereArePrereviews(prereviews)

    expect(actual).toStrictEqual(E.right(prereviews))
  })

  test('when the list is empty', () => {
    const actual = _.ensureThereArePrereviews([])

    expect(actual).toStrictEqual(E.left(_.NoPrereviews))
  })
})

test.prop([fc.supportedLocale()])('toResponse', locale => {
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
