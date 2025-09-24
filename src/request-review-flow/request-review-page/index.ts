import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.ts'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import { type LogInResponse, type PageResponse, RedirectResponse } from '../../response.ts'
import { type GetReviewRequestEnv, isReviewRequestPreprintId, maybeGetReviewRequest } from '../../review-request.ts'
import { requestReviewStartMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { requestReviewPage } from './request-review-page.ts'

export const requestReview = ({
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<GetPreprintTitleEnv & GetReviewRequestEnv, LogInResponse | PageResponse | RedirectResponse> =>
  pipe(
    RTE.Do,
    RTE.let('user', () => user),
    RTE.let('locale', () => locale),
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
          .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound(locale))
          .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      requestReviewPage,
    ),
  )
