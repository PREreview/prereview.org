import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { canUploadAvatar } from '../feature-flags'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { LogInResponse } from '../response'
import { myDetailsMatch } from '../routes'
import type { User } from '../user'
import { createPage } from './change-avatar-form-page'

export type Env = EnvFor<ReturnType<typeof changeAvatar>>

export const changeAvatar = ({ method, user }: { method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW(
      'canUploadAvatar',
      flow(
        RTE.fromReaderK(({ user }) => canUploadAvatar(user)),
        RTE.filterOrElse(
          canUploadAvatar => canUploadAvatar,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.let('method', () => method),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(myDetailsMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .exhaustive(),
      state =>
        match(state)
          .with({ method: 'POST' }, () => havingProblemsPage)
          .otherwise(() => createPage({ form: { avatar: E.right(undefined) } })),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
