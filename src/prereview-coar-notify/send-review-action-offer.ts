import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Effect, identity, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { Status } from 'hyper-ts'
import { timeoutRequest } from '../fetch.js'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload.js'

export const sendReviewActionOfferEffect = Effect.fn(function* (payload: CoarReviewActionOfferPayload) {
  const httpClient = yield* HttpClient.HttpClient

  return yield* pipe(
    HttpClientRequest.post(payload.target.inbox),
    HttpClientRequest.bodyJson(payload),
    Effect.andThen(httpClient.execute),
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.orElseFail(() => 'unavailable' as const),
    Effect.andThen(() => Effect.void),
  )
})

export const sendReviewActionOffer = (payload: CoarReviewActionOfferPayload) =>
  pipe(
    payload.target.inbox,
    F.Request('POST'),
    F.setBody(JSON.stringify(payload), 'application/json'),
    F.send,
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.bimap(
      () => 'unavailable' as const,
      () => undefined,
    ),
  )
