import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-prereviews-page/no-prereviews.js'
import { myPrereviewsMatch } from '../../src/routes.js'
import * as fc from './fc.js'

describe('ensureThereArePrereviews', () => {
  test.prop([fc.nonEmptyArray(fc.prereview())])('when the list is not empty', prereviews => {
    const actual = _.ensureThereArePrereviews(prereviews)

    expect(actual).toStrictEqual(E.right(prereviews))
  })

  test('when the list is empty', () => {
    const actual = _.ensureThereArePrereviews([])

    expect(actual).toStrictEqual(E.left(_.NoPrereviews))
  })
})

test('toResponse', () => {
  const actual = _.toResponse(_.NoPrereviews)

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
