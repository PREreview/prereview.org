import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../author-invite'
import type { Html } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response'
import { authorInviteCheckMatch } from '../routes'
import type { User } from '../user'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteStart = ({
  id,
  user,
}: {
  id: Uuid
  user?: User
}): RT.ReaderTask<GetPrereviewEnv & GetAuthorInviteEnv, LogInResponse | PageResponse | RedirectResponse> =>
  pipe(
    RTE.Do,
    RTE.apS('invite', getAuthorInvite(id)),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.apSW('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(authorInviteCheckMatch.formatter, { id }) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id }) }),
    ),
  )
