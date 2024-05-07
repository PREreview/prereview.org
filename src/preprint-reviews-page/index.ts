import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags'
import { pageNotFound } from '../http-error'
import { type GetPreprintEnv, getPreprint } from '../preprint'
import type { PageResponse, TwoUpPageResponse } from '../response'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { failureMessage } from './failure-message'
import { createPage } from './preprint-reviews'
import { type GetPrereviewsEnv, getPrereviews } from './prereviews'
import { type GetRapidPrereviewsEnv, getRapidPrereviews } from './rapid-prereviews'

export { GetPrereviewsEnv, Prereview } from './prereviews'
export { GetRapidPrereviewsEnv, RapidPrereview } from './rapid-prereviews'

export const preprintReviews = (
  id: IndeterminatePreprintId,
  user?: User,
): RT.ReaderTask<
  CanRequestReviewsEnv & GetPreprintEnv & GetPrereviewsEnv & GetRapidPrereviewsEnv,
  PageResponse | TwoUpPageResponse
> =>
  pipe(
    getPreprint(id),
    RTE.chainW(preprint =>
      pipe(
        RTE.Do,
        RTE.let('preprint', () => preprint),
        RTE.apS('rapidPrereviews', getRapidPrereviews(preprint.id)),
        RTE.apSW('reviews', getPrereviews(preprint.id)),
        RTE.apSW('canRequestReviews', RTE.fromReader(canRequestReviews(user))),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      createPage,
    ),
  )
