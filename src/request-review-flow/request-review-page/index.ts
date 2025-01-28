import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { type GetReviewRequestEnv, isReviewRequestPreprintId, maybeGetReviewRequest } from '../../review-request.js'
import { requestReviewStartMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { requestReviewPage } from './request-review-page.js'

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
    RTE.let('user', () => user),
    RTE.chainFirstW(
      flow(
        RTE.fromReaderK(({ user }) => canRequestReviews(user)),
        RTE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => 'not-found' as const,
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
        ({ preprintId, user }) => (user ? maybeGetReviewRequest(user.orcid, preprintId) : RTE.right(undefined)),
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
          .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound)
          .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => havingProblemsPage)
          .exhaustive(),
      requestReviewPage,
    ),
  )
