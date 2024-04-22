import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { type GetReviewRequestEnv, isReviewRequestPreprintId, maybeGetReviewRequest } from '../../review-request'
import { requestReviewMatch, requestReviewStartMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { requestReviewPage } from './request-review-page'

export const requestReview = ({
  preprint,
  user,
}: {
  preprint: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  CanRequestReviewsEnv & GetPreprintTitleEnv & GetReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS(
      'user',
      pipe(
        RTE.fromNullable('no-session' as const)(user),
        RTE.chainFirstW(
          flow(
            RTE.fromReaderK(canRequestReviews),
            RTE.filterOrElse(
              canRequestReviews => canRequestReviews,
              () => 'not-found' as const,
            ),
          ),
        ),
      ),
    ),
    RTE.bindW('preprint', () => getPreprintTitle(preprint)),
    RTE.bindW(
      'preprintId',
      flow(
        ({ preprint }) => preprint.id,
        RTE.fromPredicate(isReviewRequestPreprintId, () => 'not-found' as const),
      ),
    ),
    RTE.chainFirstW(
      flow(
        ({ preprintId, user }) => maybeGetReviewRequest(user.orcid, preprintId),
        RTE.chainW(reviewRequest =>
          match(reviewRequest)
            .with({ status: P.string }, () => RTE.left('already-started' as const))
            .with(undefined, RTE.right)
            .exhaustive(),
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('already-started', () =>
            RedirectResponse({ location: format(requestReviewStartMatch.formatter, { id: preprint }) }),
          )
          .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      state => requestReviewPage(state.preprint),
    ),
  )