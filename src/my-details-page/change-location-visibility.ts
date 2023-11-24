import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { type Location, getLocation, saveLocation } from '../location'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeLocationVisibilityMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

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

function createFormPage({ location }: { location: Location }) {
  return PageResponse({
    title: plainText`Who can see your location?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeLocationVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your location?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="locationVisibility"
                  id="location-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="location-visibility-tip-public"
                  ${match(location.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="location-visibility-tip-public" role="note">We’ll show it on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="locationVisibility"
                  id="location-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="location-visibility-tip-restricted"
                  ${match(location.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="location-visibility-tip-restricted" role="note">We won’t share it with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLocationVisibilityMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
