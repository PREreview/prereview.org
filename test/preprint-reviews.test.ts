import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { GetPreprintEnv } from '../src/preprint'
import * as _ from '../src/preprint-reviews'
import { preprintReviewsMatch } from '../src/routes'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('preprintReviews', () => {
  test.prop([
    fc.preprint(),
    fc.array(
      fc.record({
        authors: fc.record({
          named: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcid(),
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
            orcid: fc.orcid(),
          },
          { requiredKeys: ['name'] },
        ),
        questions: fc.record({
          availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
        }),
      }),
    ),
  ])('when the reviews can be loaded', async (preprint, prereviews, rapidPrereviews) => {
    const getPreprint = jest.fn<GetPreprintEnv['getPreprint']>(_ => TE.right(preprint))
    const getPrereviews = jest.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))
    const getRapidPrereviews = jest.fn<_.GetRapidPrereviewsEnv['getRapidPrereviews']>(_ => TE.right(rapidPrereviews))

    const actual = await _.preprintReviews(preprint.id)({
      getPreprint,
      getPrereviews,
      getRapidPrereviews,
    })()

    expect(actual).toStrictEqual({
      _tag: 'TwoUpPageResponse',
      canonical: format(preprintReviewsMatch.formatter, {
        id: preprint.id,
      }),
      title: expect.stringContaining('PREreviews of'),
      h1: expect.stringContaining('PREreviews of'),
      aside: expect.stringContaining('Server'),
      main: expect.stringContaining('PREreview'),
    })
    expect(getPreprint).toHaveBeenCalledWith(preprint.id)
    expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
    expect(getRapidPrereviews).toHaveBeenCalledWith(preprint.id)
  })

  test.prop([fc.indeterminatePreprintId()])('when the preprint is not found', async preprintId => {
    const actual = await _.preprintReviews(preprintId)({
      getPreprint: () => TE.left('not-found'),
      getPrereviews: shouldNotBeCalled,
      getRapidPrereviews: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId()])('when the preprint is unavailable', async preprintId => {
    const actual = await _.preprintReviews(preprintId)({
      getPreprint: () => TE.left('unavailable'),
      getPrereviews: shouldNotBeCalled,
      getRapidPrereviews: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([
    fc.preprint(),
    fc.array(
      fc.record({
        author: fc.record(
          {
            name: fc.string(),
            orcid: fc.orcid(),
          },
          { requiredKeys: ['name'] },
        ),
        questions: fc.record({
          availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
        }),
      }),
    ),
  ])('when the reviews cannot be loaded', async (preprint, rapidPrereviews) => {
    const actual = await _.preprintReviews(preprint.id)({
      getPreprint: () => TE.right(preprint),
      getPrereviews: () => TE.left('unavailable'),
      getRapidPrereviews: () => TE.right(rapidPrereviews),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([
    fc.preprint(),
    fc.array(
      fc.record({
        authors: fc.record({
          named: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcid(),
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
  ])('when the rapid PREreviews cannot be loaded', async (preprint, prereviews) => {
    const actual = await _.preprintReviews(preprint.id)({
      getPreprint: () => TE.right(preprint),
      getPrereviews: () => TE.right(prereviews),
      getRapidPrereviews: () => TE.left('unavailable'),
    })()

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
