import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { type Location, getLocation, saveLocation } from './location'
import { logInAndRedirect } from './log-in'
import { getMethod, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { changeLocationVisibilityMatch, myDetailsMatch } from './routes'
import { type GetUserEnv, type User, getUser } from './user'

export const changeLocationVisibility = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.bindW(
    'location',
    RM.fromReaderTaskEitherK(({ user }) => getLocation(user.orcid)),
  ),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeLocationVisibilityForm(state.user, state.location))
      .otherwise(() => showChangeLocationVisibilityForm(state.user, state.location)),
  ),
  RM.orElseW(error =>
    match(error)
      .returnType<
        RM.ReaderMiddleware<
          FathomEnv & GetUserEnv & OAuthEnv & PhaseEnv & PublicUrlEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
      .with(
        'not-found',
        RM.fromMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
      )
      .with('no-session', () => logInAndRedirect(myDetailsMatch.formatter, {}))
      .with(P.union('unavailable', P.instanceOf(Error)), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showChangeLocationVisibilityForm = (user: User, location: Location) =>
  pipe(
    RM.rightReader(createFormPage(user, location)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeLocationVisibilityFormD = pipe(D.struct({ locationVisibility: D.literal('public', 'restricted') }))

const handleChangeLocationVisibilityForm = (user: User, location: Location) =>
  pipe(
    RM.decodeBody(body => ChangeLocationVisibilityFormD.decode(body)),
    RM.orElseW(() => RM.of({ locationVisibility: 'restricted' as const })),
    RM.ichainW(
      flow(
        ({ locationVisibility }) => ({ ...location, visibility: locationVisibility }),
        RM.fromReaderTaskEitherK(location => saveLocation(user.orcid, location)),
        RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
  )

function createFormPage(user: User, location: Location) {
  return page({
    title: plainText`Who can see your location?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
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
      </main>
    `,
    skipLinks: [[html`Skip to form`, '#form']],
    user,
  })
}
