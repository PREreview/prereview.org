import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags.js'
import { pageNotFound } from '../http-error.js'
import { type GetPreprintEnv, getPreprint } from '../preprint.js'
import type { PageResponse, TwoUpPageResponse } from '../response.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import type { User } from '../user.js'
import { failureMessage } from './failure-message.js'
import { createPage } from './preprint-reviews.js'
import { type GetPrereviewsEnv, getPrereviews } from './prereviews.js'
import { type GetRapidPrereviewsEnv, getRapidPrereviews } from './rapid-prereviews.js'

export type { GetPrereviewsEnv, Prereview } from './prereviews.js'
export type { GetRapidPrereviewsEnv, RapidPrereview } from './rapid-prereviews.js'

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
