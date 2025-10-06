import { Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.ts'
import { havingProblemsPage } from '../http-error.ts'
import { deleteLanguages, getLanguages, saveLanguages } from '../languages.ts'
import type { SupportedLocale } from '../locales/index.ts'
import { LogInResponse, RedirectResponse } from '../Response/index.ts'
import { myDetailsMatch } from '../routes.ts'
import { NonEmptyStringC } from '../types/NonEmptyString.ts'
import type { User } from '../user.ts'
import { createFormPage } from './change-languages-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeLanguages>>

export const changeLanguages = ({
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
    RTE.matchEW(
      error =>
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state => match(state).with({ method: 'POST' }, handleChangeLanguagesForm).otherwise(showChangeLanguagesForm),
    ),
  )

const showChangeLanguagesForm = ({ locale, user }: { locale: SupportedLocale; user: User }) =>
  pipe(
    getLanguages(user.orcid),
    RTE.match(Option.none, Option.some),
    RT.map(languages => createFormPage(languages, locale)),
  )

const ChangeLanguagesFormD = pipe(D.struct({ languages: NonEmptyStringC }))

const handleChangeLanguagesForm = ({ body, locale, user }: { body: unknown; locale: SupportedLocale; user: User }) =>
  pipe(
    RTE.fromEither(ChangeLanguagesFormD.decode(body)),
    RTE.matchE(
      () =>
        pipe(
          deleteLanguages(user.orcid),
          RTE.matchW(
            () => havingProblemsPage(locale),
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
      ({ languages }) =>
        pipe(
          RTE.Do,
          RTE.let('value', () => languages),
          RTE.apS(
            'visibility',
            pipe(
              getLanguages(user.orcid),
              RTE.map(Struct.get('visibility')),
              RTE.orElseW(error =>
                match(error)
                  .with('not-found', () => RTE.of('restricted' as const))
                  .otherwise(RTE.left),
              ),
            ),
          ),
          RTE.chain(languages => saveLanguages(user.orcid, languages)),
          RTE.matchW(
            () => havingProblemsPage(locale),
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
    ),
  )
