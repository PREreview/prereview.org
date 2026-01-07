import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../../../author-invite.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import type { Prereview } from '../../../Prereviews/index.ts'
import { authorInviteDeclineMatch } from '../../../routes.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import {
  type LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { declinePage } from './decline-page.ts'
import { inviteDeclinedPage } from './invite-declined-page.ts'

export type { Prereview } from '../../../Prereviews/index.ts'

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteDecline = ({
  id,
  locale,
  method,
}: {
  id: Uuid
  locale: SupportedLocale
  method: string
}): RT.ReaderTask<
  GetAuthorInviteEnv & GetPrereviewEnv & SaveAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  match(method)
    .with('POST', () => handleDecline(id, locale))
    .otherwise(() => showDeclinePage(id, locale))

const showDeclinePage = (id: Uuid, locale: SupportedLocale) =>
  pipe(
    RTE.Do,
    RTE.let('locale', () => locale),
    RTE.let('inviteId', () => id),
    RTE.apS(
      'invite',
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: P.union('assigned', 'completed') }, () => RTE.left('not-found' as const))
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .with({ status: 'open' }, RTE.right)
            .otherwise(RTE.right),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.matchW(
      error =>
        match(error)
          .with('declined', () => inviteDeclinedPage(locale, id))
          .with('not-found', () => pageNotFound(locale))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      declinePage,
    ),
  )

const handleDecline = (id: Uuid, locale: SupportedLocale) =>
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
          .with('not-found', () => pageNotFound(locale))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }),
    ),
  )
