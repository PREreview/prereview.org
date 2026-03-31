import { Effect, flow, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
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
              RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint }) }),
            )
            .with({ _tag: 'ReviewRequestNotReadyToBePublished' }, () =>
              RedirectResponse({ location: Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprint }) }),
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
  locale,
}: {
  preprint: PreprintId
  reviewRequest: { reviewRequestId: Uuid.Uuid }
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
    RTE.matchW(
      () => failureMessage(locale),
      () => RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint }) }),
    ),
  )
