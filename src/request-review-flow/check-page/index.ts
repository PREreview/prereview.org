import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import {
  type GetReviewRequestEnv,
  type ReviewRequestPreprintId,
  type SaveReviewRequestEnv,
  getReviewRequest,
  isReviewRequestPreprintId,
  saveReviewRequest,
} from '../../review-request'
import { requestReviewMatch, requestReviewPublishedMatch } from '../../routes'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { checkPage } from './check-page'
import { failureMessage } from './failure-message'

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
            .with({ status: 'incomplete' }, RTE.right)
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
            .with('no-session', () =>
              LogInResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }),
            )
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
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

const handleForm = ({ preprint, user }: { preprint: ReviewRequestPreprintId; user: User }) =>
  pipe(
    publishRequest(preprint, user, 'public'),
    RTE.chainFirstW(() => saveReviewRequest(user.orcid, preprint, { status: 'completed' })),
    RTE.matchW(
      () => failureMessage,
      () => RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprint }) }),
    ),
  )
