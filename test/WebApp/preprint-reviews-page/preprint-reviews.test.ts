import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/preprint-reviews-page/index.ts'
import type { GetPreprintEnv } from '../../../src/preprint.ts'
import { preprintReviewsMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('preprintReviews', () => {
  it.effect.prop(
    'when the reviews can be loaded',
    [
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
          author: fc.persona(),
          questions: fc.record({
            availableCode: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            availableData: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            coherent: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            ethics: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            future: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            limitations: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            methods: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            newData: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            novel: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            peerReview: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            recommend: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            reproducibility: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
          }),
        }),
      ),
    ],
    ([locale, preprint, prereviews, rapidPrereviews]) =>
      Effect.gen(function* () {
        const getPreprint = vi.fn<GetPreprintEnv['getPreprint']>(_ => TE.right(preprint))
        const getPrereviews = vi.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))
        const getRapidPrereviews = vi.fn<_.GetRapidPrereviewsEnv['getRapidPrereviews']>(_ => TE.right(rapidPrereviews))

        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprint.id, locale })({
            getPreprint,
            getPrereviews,
            getRapidPrereviews,
          }),
        )

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
      }),
  )

  it.effect.prop(
    'when the preprint is not found',
    [fc.supportedLocale(), fc.indeterminatePreprintId()],
    ([locale, preprintId]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprintId, locale })({
            getPreprint: () => TE.left(new PreprintIsNotFound({})),
            getPrereviews: shouldNotBeCalled,
            getRapidPrereviews: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint is unavailable',
    [fc.supportedLocale(), fc.indeterminatePreprintId()],
    ([locale, preprintId]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprintId, locale })({
            getPreprint: () => TE.left(new PreprintIsUnavailable({})),
            getPrereviews: shouldNotBeCalled,
            getRapidPrereviews: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the reviews cannot be loaded',
    [
      fc.supportedLocale(),
      fc.preprint(),
      fc.array(
        fc.record({
          author: fc.persona(),
          questions: fc.record({
            availableCode: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            availableData: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            coherent: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            ethics: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            future: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            limitations: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            methods: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            newData: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            novel: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            peerReview: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            recommend: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
            reproducibility: fc.constantFrom('yes', 'unsure', 'not applicable', 'no'),
          }),
        }),
      ),
    ],
    ([locale, preprint, rapidPrereviews]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprint.id, locale })({
            getPreprint: () => TE.right(preprint),
            getPrereviews: () => TE.left('unavailable'),
            getRapidPrereviews: () => TE.right(rapidPrereviews),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the rapid PREreviews cannot be loaded',
    [
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
    ],
    ([locale, preprint, prereviews]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprint.id, locale })({
            getPreprint: () => TE.right(preprint),
            getPrereviews: () => TE.right(prereviews),
            getRapidPrereviews: () => TE.left('unavailable'),
          }),
        )

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
      }),
  )
})
