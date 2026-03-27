import { Effect, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { requestReviewCheckMatch, requestReviewPublishedMatch, requestReviewStartMatch } from '../../../routes.ts'
import { Temporal, Uuid } from '../../../types/index.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
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
  GetPreprintTitleEnv &
    Uuid.GenerateUuidEnv &
    EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>,
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
      ),
    ),
    RTE.bindW('reviewRequest', ({ preprint, user }) =>
      EffectToFpts.toReaderTaskEither(
        ReviewRequests.findReviewRequestByAPrereviewer({ requesterId: user.orcid, preprintId: preprint }),
      ),
    ),
    RTE.chainFirstW(({ preprint, reviewRequest, user }) =>
      Option.match(reviewRequest, {
        onSome: () => RTE.of(undefined),
        onNone: () =>
          pipe(
            RTE.rightReaderIO(Uuid.generateUuidIO),
            RTE.chainFirstW(id =>
              EffectToFpts.toReaderTaskEither(
                Effect.andThen(Temporal.currentInstant, startedAt =>
                  ReviewRequests.startReviewRequest({
                    startedAt,
                    preprintId: preprint,
                    reviewRequestId: id,
                    requesterId: user.orcid,
                  }),
                ),
              ),
            ),
          ),
      }),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () =>
            LogInResponse({ location: format(requestReviewStartMatch.formatter, { id: preprint }) }),
          )
          .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound(locale))
          .with(
            {
              _tag: P.union(
                'PreprintIsUnavailable',
                'ReviewRequestWasAlreadyStarted',
                'UnableToHandleCommand',
                'UnableToQuery',
              ),
            },
            'unavailable',
            () => havingProblemsPage(locale),
          )
          .exhaustive(),
      state =>
        match(state)
          .with({ reviewRequest: { _tag: 'None' } }, state =>
            RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: state.preprint }) }),
          )
          .with({ reviewRequest: { _tag: 'Some', value: { _tag: 'ReviewRequestPendingPublication' } } }, state =>
            carryOnPage(state.locale, state.preprint),
          )
          .with({ reviewRequest: { _tag: 'Some', value: { _tag: 'PublishedReviewRequest' } } }, () =>
            RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: state.preprint }) }),
          )
          .exhaustive(),
    ),
  )
