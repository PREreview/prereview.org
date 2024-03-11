import { format } from 'fp-ts-routing'
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
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { authorInviteDeclineMatch } from '../../routes'
import { declinePage } from './decline-page'
import { inviteDeclinedPage } from './invite-declined-page'

export const authorInviteDecline = ({
  id,
  method,
}: {
  id: Uuid
  method: string
}): RT.ReaderTask<
  GetAuthorInviteEnv & SaveAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  match(method)
    .with('POST', () => handleDecline(id))
    .otherwise(() => showDeclinePage(id))

const showDeclinePage = (id: Uuid) =>
  pipe(
    getAuthorInvite(id),
    RTE.chainFirstW(invite =>
      match(invite)
        .with({ status: P.union('assigned', 'completed') }, () => RTE.left('not-found' as const))
        .with({ status: 'declined' }, () => RTE.left('declined' as const))
        .with({ status: 'open' }, () => RTE.right(undefined))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('declined', () => inviteDeclinedPage(id))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => declinePage(id),
    ),
  )

const handleDecline = (id: Uuid) =>
  pipe(
    getAuthorInvite(id),
    RTE.chainFirstW(invite =>
      match(invite)
        .with({ status: P.union('assigned', 'completed') }, () => RTE.left('not-found' as const))
        .with({ status: 'declined' }, () => RTE.right(undefined))
        .with({ status: 'open' }, invite => saveAuthorInvite(id, { status: 'declined', review: invite.review }))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }),
    ),
  )
