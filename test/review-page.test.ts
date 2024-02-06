import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../src/review-page'
import { reviewMatch } from '../src/routes'
import * as fc from './fc'

describe('reviewPage', () => {
  test.prop([
    fc.integer(),
    fc.record({
      authors: fc.record({
        named: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
      }),
      doi: fc.doi(),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      license: fc.constant('CC-BY-4.0' as const),
      published: fc.plainDate(),
      preprint: fc.record({
        id: fc.preprintId(),
        language: fc.languageCode(),
        title: fc.html(),
        url: fc.url(),
      }),
      structured: fc.boolean(),
      text: fc.html(),
    }),
  ])('when the review can be loaded', async (id, prereview) => {
    const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

    const actual = await _.reviewPage(id)({ getPrereview })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewMatch.formatter, { id }),
      status: Status.OK,
      title: expect.stringContaining('PREreview of'),
      nav: expect.stringContaining('See other reviews'),
      main: expect.stringContaining('PREreview of'),
      skipToLabel: 'prereview',
      js: [],
    })
    expect(getPrereview).toHaveBeenCalledWith(id)
  })

  test.prop([fc.integer()])('when the review is not found', async id => {
    const actual = await _.reviewPage(id)({ getPrereview: () => TE.left('not-found') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.integer()])('when the review was removed', async id => {
    const actual = await _.reviewPage(id)({ getPrereview: () => TE.left('removed') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.Gone,
      title: expect.stringContaining('removed'),
      main: expect.stringContaining('removed'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.integer()])('when the review cannot be loaded', async id => {
    const actual = await _.reviewPage(id)({ getPrereview: () => TE.left('unavailable') })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })
})
