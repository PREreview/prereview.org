import { Option, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { requestReviewStartMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { type LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { requestReviewPage } from './request-review-page.ts'

export const requestReview = ({
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv & EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestQueries>,
  LogInResponse | PageResponse | RedirectResponse
> =>
  pipe(
    RTE.Do,
    RTE.let('user', () => user),
    RTE.let('locale', () => locale),
    RTE.bindW('preprint', () => getPreprintTitle(preprint)),
    RTE.chainFirstW(
      flow(
        ({ preprint, user }) =>
          user
            ? EffectToFpts.toReaderTaskEither(
                ReviewRequests.findReviewRequestByAPrereviewer({ requesterId: user.orcid, preprintId: preprint.id }),
              )
            : RTE.right(Option.none()),
        RTE.chainW(
          Option.match({
            onSome: () => RTE.left('already-started' as const),
            onNone: () => RTE.right(undefined),
          }),
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
          .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, 'unavailable', () =>
            havingProblemsPage(locale),
          )
          .exhaustive(),
      requestReviewPage,
    ),
  )
