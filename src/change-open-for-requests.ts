import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml, sendHtml } from './html'
import {
  type IsOpenForRequests,
  type IsOpenForRequestsEnv,
  isOpenForRequests,
  saveOpenForRequests,
} from './is-open-for-requests'
import { logInAndRedirect } from './log-in'
import { getMethod, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { changeOpenForRequestsMatch, myDetailsMatch } from './routes'
import { type GetUserEnv, type User, getUser } from './user'

export const changeOpenForRequests = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeOpenForRequestsForm(state.user))
      .otherwise(() => showChangeOpenForRequestsForm(state.user)),
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
      .with('no-session', () => logInAndRedirect(myDetailsMatch.formatter, {}))
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showChangeOpenForRequestsForm = (user: User) =>
  pipe(
    RM.fromReaderTaskEither(isOpenForRequests(user.orcid)),
    RM.map(O.some),
    RM.orElseW(() => RM.of(O.none)),
    RM.chainReaderKW(openForRequests => createFormPage(user, openForRequests)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showChangeOpenForRequestsErrorForm = (user: User) =>
  pipe(
    RM.rightReader(createFormPage(user, O.none, true)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeOpenForRequestsFormD = pipe(D.struct({ openForRequests: D.literal('yes', 'no') }))

const handleChangeOpenForRequestsForm = (user: User) =>
  pipe(
    RM.decodeBody(body => ChangeOpenForRequestsFormD.decode(body)),
    RM.ichainW(
      flow(
        RM.fromReaderTaskEitherK(({ openForRequests }) =>
          match(openForRequests)
            .returnType<RTE.ReaderTaskEither<IsOpenForRequestsEnv, 'unavailable', IsOpenForRequests>>()
            .with('yes', () =>
              pipe(
                RTE.Do,
                RTE.let('value', () => true),
                RTE.apS(
                  'visibility',
                  pipe(
                    isOpenForRequests(user.orcid),
                    RTE.map(openForRequests =>
                      match(openForRequests)
                        .with({ value: true, visibility: P.select() }, identity)
                        .with({ value: false }, () => 'restricted' as const)
                        .exhaustive(),
                    ),
                    RTE.orElseW(error =>
                      match(error)
                        .with('not-found', () => RTE.of('restricted' as const))
                        .otherwise(RTE.left),
                    ),
                  ),
                ),
              ),
            )
            .with('no', () => RTE.of({ value: false }))
            .exhaustive(),
        ),
        RM.chainReaderTaskEitherK(openForRequests => saveOpenForRequests(user.orcid, openForRequests)),
        RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
    RM.orElseW(() => showChangeOpenForRequestsErrorForm(user)),
  )

function createFormPage(user: User, openForRequests: O.Option<IsOpenForRequests>, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Are you happy to take requests for a PREreview?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeOpenForRequestsMatch.formatter, {})}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#open-for-requests-yes">Select yes if you are happy to take requests for a PREreview</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${error ? rawHtml('class="error"') : ''}>
            <fieldset
              role="group"
              ${error ? rawHtml('aria-invalid="true" aria-errormessage="open-for-requests-error"') : ''}
            >
              <legend>
                <h1>Are you happy to take requests for a PREreview?</h1>
              </legend>

              ${error
                ? html`
                    <div class="error-message" id="open-for-requests-error">
                      <span class="visually-hidden">Error:</span>
                      Select yes if you are happy to take requests for a PREreview
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="openForRequests"
                      type="radio"
                      value="yes"
                      id="open-for-requests-yes"
                      ${match(openForRequests)
                        .with({ value: { value: true } }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="openForRequests"
                      type="radio"
                      value="no"
                      ${match(openForRequests)
                        .with({ value: { value: false } }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    user,
  })
}
