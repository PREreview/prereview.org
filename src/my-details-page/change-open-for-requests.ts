import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html'
import { havingProblemsPage } from '../http-error'
import {
  type IsOpenForRequests,
  type IsOpenForRequestsEnv,
  isOpenForRequests,
  saveOpenForRequests,
} from '../is-open-for-requests'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

export type Env = EnvFor<ReturnType<typeof changeOpenForRequests>>

export const changeOpenForRequests = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
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
      state =>
        match(state).with({ method: 'POST' }, handleChangeOpenForRequestsForm).otherwise(showChangeOpenForRequestsForm),
    ),
  )

const showChangeOpenForRequestsForm = flow(
  ({ user }: { user: User }) => isOpenForRequests(user.orcid),
  RTE.match(() => O.none, O.some),
  RT.map(openForRequests => createFormPage({ openForRequests })),
)

const ChangeOpenForRequestsFormD = pipe(D.struct({ openForRequests: D.literal('yes', 'no') }))

const handleChangeOpenForRequestsForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(ChangeOpenForRequestsFormD.decode(body)),
    RTE.matchE(
      () => RT.of(createFormPage({ openForRequests: O.none, error: true })),
      flow(
        ({ openForRequests }) =>
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
        RTE.chain(openForRequests => saveOpenForRequests(user.orcid, openForRequests)),
        RTE.matchW(
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

function createFormPage({
  openForRequests,
  error = false,
}: {
  openForRequests: O.Option<IsOpenForRequests>
  error?: boolean
}) {
  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Are you happy to take requests for a PREreview?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
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
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
