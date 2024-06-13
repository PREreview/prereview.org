import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error.js'
import { deleteLanguages, getLanguages, saveLanguages } from '../languages.js'
import { LogInResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { createFormPage } from './change-languages-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeLanguages>>

export const changeLanguages = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state => match(state).with({ method: 'POST' }, handleChangeLanguagesForm).otherwise(showChangeLanguagesForm),
    ),
  )

const showChangeLanguagesForm = flow(
  ({ user }: { user: User }) => getLanguages(user.orcid),
  RTE.match(() => O.none, O.some),
  RT.map(createFormPage),
)

const ChangeLanguagesFormD = pipe(D.struct({ languages: NonEmptyStringC }))

const handleChangeLanguagesForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(ChangeLanguagesFormD.decode(body)),
    RTE.matchE(
      () =>
        pipe(
          deleteLanguages(user.orcid),
          RTE.matchW(
            () => havingProblemsPage,
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
              RTE.map(get('visibility')),
              RTE.orElseW(error =>
                match(error)
                  .with('not-found', () => RTE.of('restricted' as const))
                  .otherwise(RTE.left),
              ),
            ),
          ),
          RTE.chain(languages => saveLanguages(user.orcid, languages)),
          RTE.matchW(
            () => havingProblemsPage,
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
