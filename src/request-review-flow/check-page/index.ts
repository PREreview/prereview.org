import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import {
  type GetReviewRequestEnv,
  type IncompleteReviewRequest,
  type ReviewRequestPreprintId,
  type SaveReviewRequestEnv,
  getReviewRequest,
  isReviewRequestPreprintId,
  saveReviewRequest,
} from '../../review-request.js'
import { requestReviewMatch, requestReviewPersonaMatch, requestReviewPublishedMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { checkPage } from './check-page.js'
import { failureMessage } from './failure-message.js'

export interface PublishRequestEnv {
  publishRequest: (
    preprint: ReviewRequestPreprintId,
    user: User,
    persona: 'public' | 'pseudonym',
  ) => TE.TaskEither<'unavailable', void>
}

export const requestReviewCheck = ({
  method,
  preprint,
  user,
}: {
  method: string
  preprint: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  GetPreprintTitleEnv & GetReviewRequestEnv & PublishRequestEnv & SaveReviewRequestEnv,
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
        ({ user, preprint }) => getReviewRequest(user.orcid, preprint),
        RTE.chainW(request =>
          match(request)
            .with({ status: 'completed' }, () => RTE.left('already-completed' as const))
            .with({ status: 'incomplete', persona: P.optional(P.nullish) }, () => RTE.left('no-persona' as const))
            .with({ status: 'incomplete', persona: P.string }, RTE.right)
            .exhaustive(),
        ),
      ),
    ),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprint }) }),
            )
            .with('no-persona', () =>
              RedirectResponse({ location: format(requestReviewPersonaMatch.formatter, { id: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }),
            )
            .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound)
            .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handleForm)
          .with({ method: P.string }, flow(checkPage, RT.of))
          .exhaustive(),
    ),
  )

const publishRequest = (
  preprint: ReviewRequestPreprintId,
  user: User,
  persona: 'public' | 'pseudonym',
): RTE.ReaderTaskEither<PublishRequestEnv, 'unavailable', void> =>
  R.asks(({ publishRequest }) => publishRequest(preprint, user, persona))

const handleForm = ({
  preprint,
  reviewRequest,
  user,
}: {
  preprint: ReviewRequestPreprintId
  reviewRequest: IncompleteReviewRequest
  user: User
}) =>
  pipe(
    publishRequest(preprint, user, reviewRequest.persona ?? 'public'),
    RTE.chainFirstW(() => saveReviewRequest(user.orcid, preprint, { status: 'completed' })),
    RTE.matchW(
      () => failureMessage,
      () => RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprint }) }),
    ),
  )
