import { flow, Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { havingProblemsPage } from '../http-error.js'
import { DefaultLocale } from '../locales/index.js'
import { deleteLocation, getLocation, saveLocation } from '../location.js'
import { LogInResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { createFormPage } from './change-location-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeLocation>>

export const changeLocation = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
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
      state => match(state).with({ method: 'POST' }, handleChangeLocationForm).otherwise(showChangeLocationForm),
    ),
  )

const showChangeLocationForm = flow(
  ({ user }: { user: User }) => getLocation(user.orcid),
  RTE.match(Option.none, Option.some),
  RT.map(createFormPage),
)

const ChangeLocationFormD = pipe(D.struct({ location: NonEmptyStringC }))

const handleChangeLocationForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(ChangeLocationFormD.decode(body)),
    RTE.matchE(
      () =>
        pipe(
          deleteLocation(user.orcid),
          RTE.matchW(
            () => havingProblemsPage(DefaultLocale),
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
      ({ location }) =>
        pipe(
          RTE.Do,
          RTE.let('value', () => location),
          RTE.apS(
            'visibility',
            pipe(
              getLocation(user.orcid),
              RTE.map(Struct.get('visibility')),
              RTE.orElseW(error =>
                match(error)
                  .with('not-found', () => RTE.of('restricted' as const))
                  .otherwise(RTE.left),
              ),
            ),
          ),
          RTE.chain(location => saveLocation(user.orcid, location)),
          RTE.matchW(
            () => havingProblemsPage(DefaultLocale),
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
    ),
  )
