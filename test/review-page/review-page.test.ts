import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/review-page/index.js'
import { reviewMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('reviewPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.record({
      authors: fc.record({
        named: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        anonymous: fc.integer({ min: 0 }),
      }),
      doi: fc.doi(),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      license: fc.constant('CC-BY-4.0'),
      live: fc.boolean(),
      published: fc.plainDate(),
      preprint: fc.record({
        id: fc.preprintId(),
        language: fc.languageCode(),
        title: fc.html(),
        url: fc.url(),
      }),
      requested: fc.boolean(),
      structured: fc.boolean(),
      text: fc.html(),
    }),
    fc.array(
      fc.record({
        authors: fc.record({
          named: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        }),
        doi: fc.doi(),
        id: fc.integer(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        license: fc.constant('CC-BY-4.0'),
        published: fc.plainDate(),
        text: fc.html(),
      }),
    ),
    fc.boolean(),
  ])('when the review can be loaded', async (locale, id, prereview, feedback, canWriteComments) => {
    const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))
    const getFeedback = jest.fn<_.GetFeedbackEnv['getFeedback']>(_ => TE.right(feedback))

    const actual = await _.reviewPage({ id, locale })({
      getPrereview,
      getFeedback,
      canWriteComments: () => canWriteComments,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewMatch.formatter, { id }),
      status: Status.OK,
      title: expect.anything(),
      description: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'prereview',
      js: [],
    })
    expect(getPrereview).toHaveBeenCalledWith(id)
    expect(getFeedback).toHaveBeenCalledWith(prereview.doi)
  })

  test.prop([fc.supportedLocale(), fc.integer(), fc.boolean()])(
    'when the review is not found',
    async (locale, id, canWriteComments) => {
      const actual = await _.reviewPage({ id, locale })({
        getPrereview: () => TE.left('not-found'),
        getFeedback: shouldNotBeCalled,
        canWriteComments: () => canWriteComments,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.supportedLocale(), fc.integer(), fc.boolean()])(
    'when the review was removed',
    async (locale, id, canWriteComments) => {
      const actual = await _.reviewPage({ id, locale })({
        getPrereview: () => TE.left('removed'),
        getFeedback: shouldNotBeCalled,
        canWriteComments: () => canWriteComments,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.Gone,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.supportedLocale(), fc.integer(), fc.boolean()])(
    'when the review cannot be loaded',
    async (locale, id, canWriteComments) => {
      const actual = await _.reviewPage({ id, locale })({
        getPrereview: () => TE.left('unavailable'),
        getFeedback: shouldNotBeCalled,
        canWriteComments: () => canWriteComments,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.record({
      authors: fc.record({
        named: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        anonymous: fc.integer({ min: 0 }),
      }),
      doi: fc.doi(),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      license: fc.constant('CC-BY-4.0'),
      live: fc.boolean(),
      published: fc.plainDate(),
      preprint: fc.record({
        id: fc.preprintId(),
        language: fc.languageCode(),
        title: fc.html(),
        url: fc.url(),
      }),
      requested: fc.boolean(),
      structured: fc.boolean(),
      text: fc.html(),
    }),
    fc.boolean(),
  ])('when the feedback cannot be loaded', async (locale, id, prereview, canWriteComments) => {
    const actual = await _.reviewPage({ id, locale })({
      getPrereview: () => TE.right(prereview),
      getFeedback: () => TE.left('unavailable'),
      canWriteComments: () => canWriteComments,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
