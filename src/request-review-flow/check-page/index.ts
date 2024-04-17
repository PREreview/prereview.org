import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import {
  type GetReviewRequestEnv,
  type SaveReviewRequestEnv,
  getReviewRequest,
  saveReviewRequest,
} from '../../review-request'
import { requestReviewMatch, requestReviewPublishedMatch } from '../../routes'
import type { User } from '../../user'
import { checkPage } from './check-page'
import { failureMessage } from './failure-message'

export interface PublishRequestEnv {
  publishRequest: () => TE.TaskEither<'unavailable', void>
}

export const requestReviewCheck = ({
  method,
  user,
}: {
  method: string
  user?: User
}): RT.ReaderTask<
  GetReviewRequestEnv & PublishRequestEnv & SaveReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW(
      'reviewRequest',
      flow(
        ({ user }) => getReviewRequest(user.orcid),
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
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, {}) }),
            )
            .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, {}) }))
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

const publishRequest = (): RTE.ReaderTaskEither<PublishRequestEnv, 'unavailable', void> =>
  R.asks(({ publishRequest }) => publishRequest())

const handleForm = ({ user }: { user: User }) =>
  pipe(
    publishRequest(),
    RTE.chainFirstW(() => saveReviewRequest(user.orcid, { status: 'completed' })),
    RTE.matchW(
      () => failureMessage,
      () => RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, {}) }),
    ),
  )
