import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import { type Languages, getLanguages, saveLanguages } from '../../languages.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { createFormPage } from './change-languages-visibility-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeLanguagesVisibility>>

export const changeLanguagesVisibility = ({
  body,
  locale,
  method,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.let('locale', () => locale),
    RTE.bindW('languages', ({ user }) => getLanguages(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage(locale)))
          .exhaustive(),
      state =>
        match(state)
          .with({ method: 'POST' }, handleChangeLanguagesVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeLanguagesVisibilityFormD = pipe(D.struct({ languagesVisibility: D.literal('public', 'restricted') }))

const handleChangeLanguagesVisibilityForm = ({
  body,
  languages,
  locale,
  user,
}: {
  body: unknown
  languages: Languages
  locale: SupportedLocale
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeLanguagesVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ languagesVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ languagesVisibility }) => ({ ...languages, visibility: languagesVisibility }),
        languages => saveLanguages(user.orcid, languages),
        RTE.matchW(
          () => havingProblemsPage(locale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
