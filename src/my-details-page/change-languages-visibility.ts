import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error'
import { type Languages, getLanguages, saveLanguages } from '../languages'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response'
import { myDetailsMatch } from '../routes'
import type { User } from '../user'
import { createFormPage } from './change-languages-visibility-form-page'

export type Env = EnvFor<ReturnType<typeof changeLanguagesVisibility>>

export const changeLanguagesVisibility = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('languages', ({ user }) => getLanguages(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage))
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
  user,
}: {
  body: unknown
  languages: Languages
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
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
