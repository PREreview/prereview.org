import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { deleteAvatar, getAvatar } from '../avatar.js'
import { havingProblemsPage } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import { FlashMessageResponse, LogInResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { page } from './remove-avatar-form-page.js'

export type Env = EnvFor<ReturnType<typeof removeAvatar>>

export const removeAvatar = ({ locale, method, user }: { locale: SupportedLocale; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('existing', ({ user }) => getAvatar(user.orcid)),
    RTE.let('method', () => method),
    RTE.let('locale', () => locale),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(myDetailsMatch.formatter, {}) }))
            .with('not-found', () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }))
            .with('unavailable', () => havingProblemsPage(locale))
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handleRemoveAvatarForm)
          .otherwise(({ locale }) => RT.of(page(locale))),
    ),
  )

const handleRemoveAvatarForm = ({ locale, user }: { locale: SupportedLocale; user: User }) =>
  pipe(
    deleteAvatar(user.orcid),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'avatar-removed' }),
    ),
  )
