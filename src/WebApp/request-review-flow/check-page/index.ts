import { Effect, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import { type SaveReviewRequestEnv, saveReviewRequest } from '../../../review-request.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { requestReviewPersonaMatch, requestReviewPublishedMatch } from '../../../routes.ts'
import { Temporal, type Uuid } from '../../../types/index.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { checkPage } from './check-page.ts'
import { failureMessage } from './failure-message.ts'

export const requestReviewCheck = ({
  method,
  preprint,
  user,
  locale,
}: {
  method: string
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv &
    SaveReviewRequestEnv &
    EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>,
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
        ReviewRequests.getReviewRequestReadyToBePublished({ requesterId: user.orcid, preprintId: preprint }),
      ),
    ),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'ReviewRequestHasBeenPublished' }, () =>
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprint }) }),
            )
            .with({ _tag: 'ReviewRequestNotReadyToBePublished' }, () =>
              RedirectResponse({ location: format(requestReviewPersonaMatch.formatter, { id: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
            )
            .with({ _tag: P.union('PreprintIsNotFound', 'UnknownReviewRequest') }, () => pageNotFound(locale))
            .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, 'unavailable', () =>
              havingProblemsPage(locale),
            )
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handleForm)
          .with({ method: P.string }, flow(checkPage, RT.of))
          .exhaustive(),
    ),
  )

const handleForm = ({
  preprint,
  reviewRequest: { reviewRequestId },
  user,
  locale,
}: {
  preprint: PreprintId
  reviewRequest: { reviewRequestId: Uuid.Uuid }
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    EffectToFpts.toReaderTaskEither(
      pipe(
        Effect.gen(function* () {
          const publishedAt = yield* Temporal.currentInstant

          yield* ReviewRequests.publishReviewRequest({ publishedAt, reviewRequestId })
        }),
        Effect.tapError(error => Effect.logError('Failed to publishRequest').pipe(Effect.annotateLogs({ error }))),
      ),
    ),
    RTE.chainFirstW(() => saveReviewRequest(user.orcid, preprint, { status: 'completed' })),
    RTE.matchW(
      () => failureMessage(locale),
      () => RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprint }) }),
    ),
  )
