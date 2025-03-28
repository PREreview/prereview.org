import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Effect, pipe } from 'effect'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload.js'

export const sendReviewActionOfferEffect = Effect.fn(function* (payload: CoarReviewActionOfferPayload) {
  const httpClient = yield* HttpClient.HttpClient

  return yield* pipe(
    HttpClientRequest.post(payload.target.inbox),
    HttpClientRequest.bodyJson(payload),
    Effect.andThen(httpClient.execute),
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.andThen(() => Effect.void),
  )
})
