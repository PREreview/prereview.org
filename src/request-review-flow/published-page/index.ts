import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import type { IndeterminatePreprintId } from '../../Preprints/index.js'
import { LogInResponse, type PageResponse, type RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { type GetReviewRequestEnv, getReviewRequest, isReviewRequestPreprintId } from '../../review-request.js'
import { requestReviewMatch } from '../../routes.js'
import type { User } from '../../user.js'
import { publishedPage } from './published-page.js'

export const requestReviewPublished = ({
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv & GetReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
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
          .with('incomplete', () => pageNotFound(locale))
          .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }))
          .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound(locale))
          .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      state => publishedPage(state.locale, state.preprint),
    ),
  )
