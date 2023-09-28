import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { type IsOpenForRequests, isOpenForRequests, saveOpenForRequests } from '../is-open-for-requests'
import { logInAndRedirect } from '../log-in'
import { getMethod, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { changeOpenForRequestsVisibilityMatch, myDetailsMatch } from '../routes'
import { type GetUserEnv, type User, getUser } from '../user'

export const changeOpenForRequestsVisibility = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.bindW(
    'openForRequests',
    RM.fromReaderTaskEitherK(({ user }) => isOpenForRequests(user.orcid)),
  ),
  RM.ichainW(state =>
    match(state)
      .with(
        { openForRequests: { value: false } },
        RM.fromMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
      )
      .with(
        {
          method: 'POST',
          openForRequests: { value: true },
        },
        state => handleChangeOpenForRequestsVisibilityForm(state.user, state.openForRequests),
      )
      .with({ openForRequests: { value: true } }, state =>
        showChangeOpenForRequestsVisibilityForm(state.user, state.openForRequests),
      )
      .exhaustive(),
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

const showChangeOpenForRequestsVisibilityForm = (
  user: User,
  openForRequests: Extract<IsOpenForRequests, { value: true }>,
) =>
  pipe(
    RM.rightReader(createFormPage(user, openForRequests)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeOpenForRequestsVisibilityFormD = pipe(
  D.struct({ openForRequestsVisibility: D.literal('public', 'restricted') }),
)

const handleChangeOpenForRequestsVisibilityForm = (
  user: User,
  openForRequests: Extract<IsOpenForRequests, { value: true }>,
) =>
  pipe(
    RM.decodeBody(body => ChangeOpenForRequestsVisibilityFormD.decode(body)),
    RM.orElseW(() => RM.of({ openForRequestsVisibility: 'restricted' as const })),
    RM.ichainW(
      flow(
        ({ openForRequestsVisibility }) => ({ ...openForRequests, visibility: openForRequestsVisibility }),
        RM.fromReaderTaskEitherK(openForRequests => saveOpenForRequests(user.orcid, openForRequests)),
        RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
  )

function createFormPage(user: User, openForRequests: Extract<IsOpenForRequests, { value: true }>) {
  return page({
    title: plainText`Who can see if you are open for review requests?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}" novalidate>
          <fieldset role="group">
            <legend>
              <h1>Who can see if you are open for review requests?</h1>
            </legend>

            <ol>
              <li>
                <label>
                  <input
                    name="openForRequestsVisibility"
                    id="open-for-requests-visibility-public"
                    type="radio"
                    value="public"
                    aria-describedby="open-for-requests-visibility-tip-public"
                    ${match(openForRequests.visibility)
                      .with('public', () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Everyone</span>
                </label>
                <p id="open-for-requests-visibility-tip-public" role="note">We’ll say so on your public profile.</p>
              </li>
              <li>
                <label>
                  <input
                    name="openForRequestsVisibility"
                    id="open-for-requests-visibility-restricted"
                    type="radio"
                    value="restricted"
                    aria-describedby="open-for-requests-visibility-tip-restricted"
                    ${match(openForRequests.visibility)
                      .with('restricted', () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Only PREreview</span>
                </label>
                <p id="open-for-requests-visibility-tip-restricted" role="note">We won’t let anyone else know.</p>
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
