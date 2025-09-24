import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/preprint-reviews-page/index.ts'
import type { GetPreprintEnv } from '../../src/preprint.ts'
import { preprintReviewsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('preprintReviews', () => {
  test.prop([
    fc.supportedLocale(),
    fc.preprint(),
    fc.array(
      fc.record({
        authors: fc.record({
          named: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcidId(),
              },
              { requiredKeys: ['name'] },
            ),
          ),
          anonymous: fc.integer({ min: 0 }),
        }),
        id: fc.integer(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        text: fc.html(),
      }),
    ),
    fc.array(
      fc.record({
        author: fc.record(
          {
            name: fc.string(),
            orcid: fc.orcidId(),
          },
          { requiredKeys: ['name'] },
        ),
        questions: fc.record({
          availableCode: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          availableData: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          coherent: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          ethics: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          future: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          limitations: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          methods: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          newData: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          novel: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          peerReview: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          recommend: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          reproducibility: fc.constantFrom('yes', 'unsure', 'na', 'no'),
        }),
      }),
    ),
  ])('when the reviews can be loaded', async (locale, preprint, prereviews, rapidPrereviews) => {
    const getPreprint = jest.fn<GetPreprintEnv['getPreprint']>(_ => TE.right(preprint))
    const getPrereviews = jest.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))
    const getRapidPrereviews = jest.fn<_.GetRapidPrereviewsEnv['getRapidPrereviews']>(_ => TE.right(rapidPrereviews))

    const actual = await _.preprintReviews({ id: preprint.id, locale })({
      getPreprint,
      getPrereviews,
      getRapidPrereviews,
    })()

    expect(actual).toStrictEqual({
      _tag: 'TwoUpPageResponse',
      canonical: format(preprintReviewsMatch.formatter, {
        id: preprint.id,
      }),
      title: expect.anything(),
      description: expect.anything(),
      h1: expect.anything(),
      aside: expect.anything(),
      main: expect.anything(),
      type: 'preprint',
    })
    expect(getPreprint).toHaveBeenCalledWith(preprint.id)
    expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
    expect(getRapidPrereviews).toHaveBeenCalledWith(preprint.id)
  })

  test.prop([fc.supportedLocale(), fc.indeterminatePreprintId()])(
    'when the preprint is not found',
    async (locale, preprintId) => {
      const actual = await _.preprintReviews({ id: preprintId, locale })({
        getPreprint: () => TE.left(new PreprintIsNotFound({})),
        getPrereviews: shouldNotBeCalled,
        getRapidPrereviews: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.supportedLocale(), fc.indeterminatePreprintId()])(
    'when the preprint is unavailable',
    async (locale, preprintId) => {
      const actual = await _.preprintReviews({ id: preprintId, locale })({
        getPreprint: () => TE.left(new PreprintIsUnavailable({})),
        getPrereviews: shouldNotBeCalled,
        getRapidPrereviews: shouldNotBeCalled,
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

  test.prop([
    fc.supportedLocale(),
    fc.preprint(),
    fc.array(
      fc.record({
        author: fc.record(
          {
            name: fc.string(),
            orcid: fc.orcidId(),
          },
          { requiredKeys: ['name'] },
        ),
        questions: fc.record({
          availableCode: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          availableData: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          coherent: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          ethics: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          future: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          limitations: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          methods: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          newData: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          novel: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          peerReview: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          recommend: fc.constantFrom('yes', 'unsure', 'na', 'no'),
          reproducibility: fc.constantFrom('yes', 'unsure', 'na', 'no'),
        }),
      }),
    ),
  ])('when the reviews cannot be loaded', async (locale, preprint, rapidPrereviews) => {
    const actual = await _.preprintReviews({ id: preprint.id, locale })({
      getPreprint: () => TE.right(preprint),
      getPrereviews: () => TE.left('unavailable'),
      getRapidPrereviews: () => TE.right(rapidPrereviews),
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

  test.prop([
    fc.supportedLocale(),
    fc.preprint(),
    fc.array(
      fc.record({
        authors: fc.record({
          named: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcidId(),
              },
              { requiredKeys: ['name'] },
            ),
          ),
          anonymous: fc.integer({ min: 0 }),
        }),
        id: fc.integer(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        text: fc.html(),
      }),
    ),
    fc.boolean(),
  ])('when the rapid PREreviews cannot be loaded', async (locale, preprint, prereviews) => {
    const actual = await _.preprintReviews({ id: preprint.id, locale })({
      getPreprint: () => TE.right(preprint),
      getPrereviews: () => TE.right(prereviews),
      getRapidPrereviews: () => TE.left('unavailable'),
    })()

    expect(actual).toStrictEqual({
      _tag: 'TwoUpPageResponse',
      canonical: format(preprintReviewsMatch.formatter, {
        id: preprint.id,
      }),
      title: expect.anything(),
      description: expect.anything(),
      h1: expect.anything(),
      aside: expect.anything(),
      main: expect.anything(),
      type: 'preprint',
    })
  })
})
