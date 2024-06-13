import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { timeoutRequest } from '../fetch.js'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload.js'

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
