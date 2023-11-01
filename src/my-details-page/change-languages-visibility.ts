import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { type Languages, getLanguages, saveLanguages } from '../languages'
import { logInAndRedirect } from '../log-in'
import { getMethod, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../routes'
import { type GetUserEnv, type User, getUser } from '../user'

export type Env = EnvFor<typeof changeLanguagesVisibility>

export const changeLanguagesVisibility = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.bindW(
    'languages',
    RM.fromReaderTaskEitherK(({ user }) => getLanguages(user.orcid)),
  ),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeLanguagesVisibilityForm(state.user, state.languages))
      .otherwise(() => showChangeLanguagesVisibilityForm(state.user, state.languages)),
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

const showChangeLanguagesVisibilityForm = (user: User, languages: Languages) =>
  pipe(
    RM.rightReader(createFormPage(user, languages)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeLanguagesVisibilityFormD = pipe(D.struct({ languagesVisibility: D.literal('public', 'restricted') }))

const handleChangeLanguagesVisibilityForm = (user: User, languages: Languages) =>
  pipe(
    RM.decodeBody(body => ChangeLanguagesVisibilityFormD.decode(body)),
    RM.orElseW(() => RM.of({ languagesVisibility: 'restricted' as const })),
    RM.ichainW(
      flow(
        ({ languagesVisibility }) => ({ ...languages, visibility: languagesVisibility }),
        RM.fromReaderTaskEitherK(languages => saveLanguages(user.orcid, languages)),
        RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
  )

function createFormPage(user: User, languages: Languages) {
  return page({
    title: plainText`Who can see your languages?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeLanguagesVisibilityMatch.formatter, {})}" novalidate>
          <fieldset role="group">
            <legend>
              <h1>Who can see your languages?</h1>
            </legend>

            <ol>
              <li>
                <label>
                  <input
                    name="languagesVisibility"
                    id="languages-visibility-public"
                    type="radio"
                    value="public"
                    aria-describedby="languages-visibility-tip-public"
                    ${match(languages.visibility)
                      .with('public', () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Everyone</span>
                </label>
                <p id="languages-visibility-tip-public" role="note">We’ll show them on your public profile.</p>
              </li>
              <li>
                <label>
                  <input
                    name="languagesVisibility"
                    id="languages-visibility-restricted"
                    type="radio"
                    value="restricted"
                    aria-describedby="languages-visibility-tip-restricted"
                    ${match(languages.visibility)
                      .with('restricted', () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Only PREreview</span>
                </label>
                <p id="languages-visibility-tip-restricted" role="note">We won’t share them with anyone else.</p>
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

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
