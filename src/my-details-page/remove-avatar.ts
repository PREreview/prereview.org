import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { deleteAvatar, getAvatar } from '../avatar'
import { havingProblemsPage } from '../http-error'
import { LogInResponse, RedirectResponse } from '../response'
import { myDetailsMatch } from '../routes'
import type { User } from '../user'
import { page } from './remove-avatar-form-page'

export type Env = EnvFor<ReturnType<typeof removeAvatar>>

export const removeAvatar = ({ method, user }: { method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('existing', ({ user }) => getAvatar(user.orcid)),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(myDetailsMatch.formatter, {}) }))
            .with('not-found', () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }))
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handleRemoveAvatarForm)
          .otherwise(() => RT.of(page)),
    ),
  )

const handleRemoveAvatarForm = ({ user }: { user: User }) =>
  pipe(
    deleteAvatar(user.orcid),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
