import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import {
  type GetReviewRequestEnv,
  type ReviewRequestPreprintId,
  type SaveReviewRequestEnv,
  maybeGetReviewRequest,
  saveReviewRequest,
} from '../../review-request'
import { requestReviewCheckMatch, requestReviewPublishedMatch, requestReviewStartMatch } from '../../routes'
import type { User } from '../../user'
import { carryOnPage } from './carry-on-page'

export const requestReviewStart = ({
  user,
}: {
  user?: User
}): RT.ReaderTask<
  CanRequestReviewsEnv & GetReviewRequestEnv & SaveReviewRequestEnv,
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
    RTE.bindW('reviewRequest', ({ user }) => pipe(maybeGetReviewRequest(user.orcid))),
    RTE.chainFirstW(({ reviewRequest, user }) =>
      match(reviewRequest)
        .with({ status: P.union('incomplete', 'completed') }, () => RTE.of(undefined))
        .with(undefined, () => pipe(saveReviewRequest(user.orcid, { status: 'incomplete' })))
        .exhaustive(),
    ),
    RTE.let(
      'preprint',
      () => ({ type: 'biorxiv', value: '10.1101/2024.02.07.578830' as Doi<'1101'> }) satisfies ReviewRequestPreprintId,
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(requestReviewStartMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      state =>
        match(state)
          .with({ reviewRequest: undefined }, () =>
            RedirectResponse({ location: format(requestReviewCheckMatch.formatter, {}) }),
          )
          .with({ reviewRequest: { status: 'incomplete' } }, state => carryOnPage(state.preprint))
          .with({ reviewRequest: { status: 'completed' } }, () =>
            RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, {}) }),
          )
          .exhaustive(),
    ),
  )
