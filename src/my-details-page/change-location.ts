import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { type Location, deleteLocation, getLocation, saveLocation } from '../location'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeLocationMatch, myDetailsMatch } from '../routes'
import { NonEmptyStringC } from '../types/string'
import type { User } from '../user'

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
  RTE.match(() => O.none, O.some),
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
            () => havingProblemsPage,
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
              RTE.map(get('visibility')),
              RTE.orElseW(error =>
                match(error)
                  .with('not-found', () => RTE.of('restricted' as const))
                  .otherwise(RTE.left),
              ),
            ),
          ),
          RTE.chain(location => saveLocation(user.orcid, location)),
          RTE.matchW(
            () => havingProblemsPage,
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
    ),
  )

function createFormPage(location: O.Option<Location>) {
  return PageResponse({
    title: plainText`Where are you based?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeLocationMatch.formatter, {})}" novalidate>
        <h1><label for="location">Where are you based?</label></h1>

        <input
          name="location"
          id="location"
          type="text"
          ${match(location)
            .with({ value: { value: P.select() } }, location => html`value="${location}"`)
            .when(O.isNone, () => '')
            .exhaustive()}
        />

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
