import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match, P } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { getPreprintTitle, type GetPreprintTitleEnv } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import {
  LogInResponse,
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { publishedPage } from './published-page.ts'

export const requestReviewPublished = ({
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv & EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestQueries>,
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
      ),
    ),
    RTE.bindW(
      'reviewRequest',
      EffectToFpts.toReaderTaskEitherK(({ user, preprint }) =>
        ReviewRequests.getPublishedReviewRequestByAPrereviewer({ requesterId: user.orcid, preprintId: preprint }),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () =>
            LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
          )
          .with({ _tag: P.union('PreprintIsNotFound', 'UnknownReviewRequest') }, 'not-found', () =>
            pageNotFound(locale),
          )
          .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, () => havingProblemsPage(locale))
          .exhaustive(),
      state => publishedPage(state.locale, state.preprint),
    ),
  )
