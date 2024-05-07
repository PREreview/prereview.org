import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error'
import { type Location, getLocation, saveLocation } from '../location'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response'
import { myDetailsMatch } from '../routes'
import type { User } from '../user'
import { createFormPage } from './change-location-visibility-form-page'

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
          .with('unavailable', () => RT.of(havingProblemsPage))
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
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
