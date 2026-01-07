import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type Location, getLocation, saveLocation } from '../../location.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../Response/index.ts'
import { createFormPage } from './change-location-visibility-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeLocationVisibility>>

export const changeLocationVisibility = ({
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
    RTE.bindW('location', ({ user }) => getLocation(user.orcid)),
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
          .with({ method: 'POST' }, handleChangeLocationVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeLocationVisibilityFormD = pipe(D.struct({ locationVisibility: D.literal('public', 'restricted') }))

const handleChangeLocationVisibilityForm = ({
  body,
  locale,
  location,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  location: Location
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeLocationVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ locationVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ locationVisibility }) => ({ ...location, visibility: locationVisibility }),
        location => saveLocation(user.orcid, location),
        RTE.matchW(
          () => havingProblemsPage(locale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
