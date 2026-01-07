import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../../http-error.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../../Response/index.ts'
import {
  type GetReviewRequestEnv,
  type SaveReviewRequestEnv,
  isReviewRequestPreprintId,
  maybeGetReviewRequest,
  saveReviewRequest,
} from '../../../review-request.ts'
import { requestReviewCheckMatch, requestReviewPublishedMatch, requestReviewStartMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { carryOnPage } from './carry-on-page.ts'

export const requestReviewStart = ({
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv & GetReviewRequestEnv & SaveReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse
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
          .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound(locale))
          .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      state =>
        match(state)
          .with({ reviewRequest: undefined }, state =>
            RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: state.preprint }) }),
          )
          .with({ reviewRequest: { status: 'incomplete' } }, state => carryOnPage(state.locale, state.preprint))
          .with({ reviewRequest: { status: 'completed' } }, () =>
            RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: state.preprint }) }),
          )
          .exhaustive(),
    ),
  )
