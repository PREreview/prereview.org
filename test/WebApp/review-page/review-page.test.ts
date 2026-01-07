import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/review-page/index.ts'
import { reviewMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('reviewPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.prereview(),
    fc.array(
      fc.record({
        authors: fc.record({
          named: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] })),
        }),
        doi: fc.doi(),
        id: fc.integer(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        license: fc.constant('CC-BY-4.0'),
        published: fc.plainDate(),
        text: fc.html(),
      }),
    ),
  ])('when the review can be loaded', async (locale, id, prereview, comments) => {
    const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
    const getComments = jest.fn<_.GetCommentsEnv['getComments']>(_ => TE.right(comments))

    const actual = await _.reviewPage({ id, locale })({
      getPrereview,
      getComments,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewMatch.formatter, { id }),
      status: StatusCodes.OK,
      title: expect.anything(),
      description: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'prereview',
      js: [],
    })
    expect(getPrereview).toHaveBeenCalledWith(id)
    expect(getComments).toHaveBeenCalledWith(prereview.doi)
  })

  test.prop([fc.supportedLocale(), fc.integer(), fc.boolean()])('when the review is not found', async (locale, id) => {
    const actual = await _.reviewPage({ id, locale })({
      getPrereview: () => TE.left('not-found'),
      getComments: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale(), fc.integer()])('when the review was removed', async (locale, id) => {
    const actual = await _.reviewPage({ id, locale })({
      getPrereview: () => TE.left('removed'),
      getComments: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.Gone,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale(), fc.integer()])('when the review cannot be loaded', async (locale, id) => {
    const actual = await _.reviewPage({ id, locale })({
      getPrereview: () => TE.left('unavailable'),
      getComments: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale(), fc.integer(), fc.prereview()])(
    'when the comments cannot be loaded',
    async (locale, id, prereview) => {
      const actual = await _.reviewPage({ id, locale })({
        getPrereview: () => TE.right(prereview),
        getComments: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
