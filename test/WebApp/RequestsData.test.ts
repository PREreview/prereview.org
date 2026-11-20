import { Array, Effect, Layer, Option } from 'effect'
import { Headers, HttpServerResponse } from 'effect/http'
import * as Preprints from '../../src/Domain/Preprints/index.ts'
import * as ReviewRequests from '../../src/Domain/ReviewRequests/index.ts'
import { PublicUrl } from '../../src/public-url.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import type { Uuid } from '../../src/types/index.ts'
import * as _ from '../../src/WebApp/RequestsData.ts'
import * as fc from '../fc.ts'
import { describe, expect, it } from '../vitest.ts'

const reviewRequest = fc.record({
  published: fc.instant(),
  fields: fc.constant([]),
  subfields: fc.constant([]),
  domains: fc.constant([]),
  preprintId: fc.indeterminatePreprintId(),
})

const reviewRequests = (constraints: { minLength?: number; maxLength?: number }) =>
  fc
    .tuple(fc.uniqueArray(fc.uuid(), constraints), reviewRequest)
    .map(([requestIds, reviewRequest]) => Array.map(requestIds, requestId => ({ ...reviewRequest, requestId })))

const requestIdsInBody = (response: HttpServerResponse.HttpServerResponse) =>
  Effect.promise(() =>
    HttpServerResponse.toWeb(response)
      .json()
      .then((body: ReadonlyArray<{ requestId: Uuid.Uuid }>) => Array.map(body, ({ requestId }) => requestId)),
  )

describe('RequestsData', () => {
  it.effect.prop(
    'returns the first page',
    [reviewRequests({ minLength: 101 }), fc.preprintId(), fc.origin()],
    ([reviewRequests, preprintId, publicUrl]) =>
      Effect.gen(function* () {
        const actual = yield* _.RequestsData({})

        expect(actual.status).toStrictEqual(StatusCodes.OK)
        expect(yield* requestIdsInBody(actual)).toStrictEqual(
          Array.map(reviewRequests.slice(0, 100), ({ requestId }) => requestId),
        )
        expect(Headers.get(actual.headers, 'link')).toStrictEqual(
          Option.some(
            `<${new URL(`/requests-data?cursor=${reviewRequests[100]?.requestId}`, publicUrl).href}>; rel="next"`,
          ),
        )
      }).pipe(
        Effect.provide([
          Layer.succeed(PublicUrl, publicUrl),
          Layer.mock(Preprints.Preprints, { getPreprintId: () => Effect.succeed(preprintId) }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            listAllPublishedReviewRequestsForStats: () => Effect.succeed(reviewRequests),
          }),
        ]),
      ),
  )

  it.effect.prop(
    'returns the page starting at the given request',
    [
      reviewRequests({ minLength: 1 }).chain(reviewRequests =>
        fc.tuple(fc.constant(reviewRequests), fc.integer({ min: 0, max: reviewRequests.length - 1 })),
      ),
      fc.preprintId(),
      fc.origin(),
    ],
    ([[reviewRequests, index], preprintId, publicUrl]) =>
      Effect.gen(function* () {
        const actual = yield* _.RequestsData({ cursor: reviewRequests[index]?.requestId })

        expect(actual.status).toStrictEqual(StatusCodes.OK)
        expect(yield* requestIdsInBody(actual)).toStrictEqual(
          Array.map(reviewRequests.slice(index, index + 100), ({ requestId }) => requestId),
        )
      }).pipe(
        Effect.provide([
          Layer.succeed(PublicUrl, publicUrl),
          Layer.mock(Preprints.Preprints, { getPreprintId: () => Effect.succeed(preprintId) }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            listAllPublishedReviewRequestsForStats: () => Effect.succeed(reviewRequests),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "doesn't link to a next page on the last page",
    [reviewRequests({ maxLength: 100 }), fc.preprintId(), fc.origin()],
    ([reviewRequests, preprintId, publicUrl]) =>
      Effect.gen(function* () {
        const actual = yield* _.RequestsData({})

        expect(actual.status).toStrictEqual(StatusCodes.OK)
        expect(yield* requestIdsInBody(actual)).toStrictEqual(Array.map(reviewRequests, ({ requestId }) => requestId))
        expect(Headers.get(actual.headers, 'link')).toStrictEqual(Option.none())
      }).pipe(
        Effect.provide([
          Layer.succeed(PublicUrl, publicUrl),
          Layer.mock(Preprints.Preprints, { getPreprintId: () => Effect.succeed(preprintId) }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            listAllPublishedReviewRequestsForStats: () => Effect.succeed(reviewRequests),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "returns not found when the given request doesn't exist",
    [
      fc
        .tuple(fc.uuid(), reviewRequests({}))
        .filter(([cursor, reviewRequests]) => !reviewRequests.some(({ requestId }) => requestId === cursor)),
      fc.origin(),
    ],
    ([[cursor, reviewRequests], publicUrl]) =>
      Effect.gen(function* () {
        const actual = yield* _.RequestsData({ cursor })

        expect(actual.status).toStrictEqual(StatusCodes.NotFound)
      }).pipe(
        Effect.provide([
          Layer.succeed(PublicUrl, publicUrl),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            listAllPublishedReviewRequestsForStats: () => Effect.succeed(reviewRequests),
          }),
        ]),
      ),
  )
})
