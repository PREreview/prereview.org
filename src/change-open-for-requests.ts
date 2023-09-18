import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml, sendHtml } from './html'
import { type IsOpenForRequests, isOpenForRequests, saveOpenForRequests } from './is-open-for-requests'
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
    chainReaderKW(openForRequests => createFormPage(user, openForRequests)),
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
    RM.ichainW(({ openForRequests }) =>
      pipe(
        RM.of({}),
        RM.apS(
          'value',
          match(openForRequests)
            .with('yes', () => RM.of(true))
            .with('no', () => RM.of(false))
            .exhaustive(),
        ),
        RM.apS(
          'visibility',
          pipe(
            RM.fromReaderTaskEither(isOpenForRequests(user.orcid)),
            RM.map(get('visibility')),
            RM.orElseW(error =>
              match(error)
                .with('not-found', () => RM.of('restricted' as const))
                .otherwise(RM.left),
            ),
          ),
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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
