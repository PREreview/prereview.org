import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint'
import { LogInResponse, type PageResponse, type RedirectResponse, type StreamlinePageResponse } from '../../response'
import { type GetReviewRequestEnv, getReviewRequest, isReviewRequestPreprintId } from '../../review-request'
import { requestReviewMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { publishedPage } from './published-page'

export const requestReviewPublished = ({
  preprint,
  user,
}: {
  preprint: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  GetPreprintTitleEnv & GetReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('preprint', () =>
      pipe(
        getPreprintTitle(preprint),
        RTE.map(preprint => preprint.id),
        RTE.filterOrElseW(isReviewRequestPreprintId, () => 'not-found' as const),
      ),
    ),
    RTE.bindW(
      'reviewRequest',
      flow(
        ({ preprint, user }) => getReviewRequest(user.orcid, preprint),
        RTE.chainW(request =>
          match(request)
            .with({ status: 'incomplete' }, () => RTE.left('incomplete' as const))
            .with({ status: 'completed' }, RTE.right)
            .exhaustive(),
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('incomplete', () => pageNotFound)
          .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => publishedPage,
    ),
  )
