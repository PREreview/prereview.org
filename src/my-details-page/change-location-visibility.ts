import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { havingProblemsPage } from '../http-error.js'
import { DefaultLocale } from '../locales/index.js'
import { type Location, getLocation, saveLocation } from '../location.js'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { createFormPage } from './change-location-visibility-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeLocationVisibility>>

export const changeLocationVisibility = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('location', ({ user }) => getLocation(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage(DefaultLocale)))
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
  location,
  user,
}: {
  body: unknown
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
          () => havingProblemsPage(DefaultLocale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
