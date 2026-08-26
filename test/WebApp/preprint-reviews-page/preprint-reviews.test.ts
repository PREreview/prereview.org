import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { PreprintIsNotFound, PreprintIsUnavailable, Preprints } from '../../../src/Preprints/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/preprint-reviews-page/index.ts'
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
                  name: fc.name(),
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
        const getPreprint = vi.fn<(typeof Preprints.Service)['getPreprint']>(_ => Effect.succeed(preprint))
        const getPrereviews = vi.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))
        const getRapidPrereviews = vi.fn<_.GetRapidPrereviewsEnv['getRapidPrereviews']>(_ => TE.right(rapidPrereviews))

        const runtime = yield* Effect.provide(Effect.runtime<Preprints>(), Layer.mock(Preprints, { getPreprint }))

        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprint.id, locale })({
            getPrereviews,
            getRapidPrereviews,
            runtime,
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
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprintId, locale })({
            getPrereviews: shouldNotBeCalled,
            getRapidPrereviews: shouldNotBeCalled,
            runtime,
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
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => new PreprintIsNotFound({}) }))),
  )

  it.effect.prop(
    'when the preprint is unavailable',
    [fc.supportedLocale(), fc.indeterminatePreprintId()],
    ([locale, preprintId]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprintId, locale })({
            getPrereviews: shouldNotBeCalled,
            getRapidPrereviews: shouldNotBeCalled,
            runtime,
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
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => new PreprintIsUnavailable({}) }))),
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
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprint.id, locale })({
            getPrereviews: () => TE.left('unavailable'),
            getRapidPrereviews: () => TE.right(rapidPrereviews),
            runtime,
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
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
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
                  name: fc.name(),
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
        const runtime = yield* Effect.runtime<Preprints>()

        const actual = yield* Effect.promise(
          _.preprintReviews({ id: preprint.id, locale })({
            getPrereviews: () => TE.right(prereviews),
            getRapidPrereviews: () => TE.left('unavailable'),
            runtime,
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
      }).pipe(Effect.provide(Layer.mock(Preprints, { getPreprint: () => Effect.succeed(preprint) }))),
  )
})
