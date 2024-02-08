import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../../author-invite'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import type { LogInResponse, PageResponse, RedirectResponse, StreamlinePageResponse } from '../../response'
import { inviteDeclinedPage } from './invite-declined-page'

export const authorInviteDecline = ({
  id,
}: {
  id: Uuid
}): RT.ReaderTask<
  GetAuthorInviteEnv & SaveAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getAuthorInvite(id),
    RTE.chainFirstW(invite =>
      match(invite)
        .with({ status: P.union('assigned', 'completed') }, () => RTE.left('not-found' as const))
        .with({ status: P.union('open') }, invite =>
          saveAuthorInvite(id, { status: 'declined', review: invite.review }),
        )
        .with({ status: 'declined' }, () => RTE.of(undefined))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => inviteDeclinedPage(id),
    ),
  )
