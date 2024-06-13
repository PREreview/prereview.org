import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import {
  type GetReviewRequestEnv,
  type SaveReviewRequestEnv,
  isReviewRequestPreprintId,
  maybeGetReviewRequest,
  saveReviewRequest,
} from '../../review-request.js'
import { requestReviewCheckMatch, requestReviewPublishedMatch, requestReviewStartMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { carryOnPage } from './carry-on-page.js'

export const requestReviewStart = ({
  preprint,
  user,
}: {
  preprint: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  CanRequestReviewsEnv & GetPreprintTitleEnv & GetReviewRequestEnv & SaveReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.chainFirstW(
      flow(
        RTE.fromReaderK(({ user }) => canRequestReviews(user)),
        RTE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.bindW('preprint', () =>
      pipe(
        getPreprintTitle(preprint),
        RTE.map(preprint => preprint.id),
        RTE.filterOrElseW(isReviewRequestPreprintId, () => 'not-found' as const),
      ),
    ),
    RTE.bindW('reviewRequest', ({ preprint, user }) => pipe(maybeGetReviewRequest(user.orcid, preprint))),
    RTE.chainFirstW(({ preprint, reviewRequest, user }) =>
      match(reviewRequest)
        .with({ status: P.union('incomplete', 'completed') }, () => RTE.of(undefined))
        .with(undefined, () => pipe(saveReviewRequest(user.orcid, preprint, { status: 'incomplete' })))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () =>
            LogInResponse({ location: format(requestReviewStartMatch.formatter, { id: preprint }) }),
          )
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      state =>
        match(state)
          .with({ reviewRequest: undefined }, state =>
            RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: state.preprint }) }),
          )
          .with({ reviewRequest: { status: 'incomplete' } }, state => carryOnPage(state.preprint))
          .with({ reviewRequest: { status: 'completed' } }, () =>
            RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: state.preprint }) }),
          )
          .exhaustive(),
    ),
  )
