import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { type IsOpenForRequests, isOpenForRequests, saveOpenForRequests } from '../is-open-for-requests'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeOpenForRequestsVisibilityMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

export type Env = EnvFor<ReturnType<typeof changeOpenForRequestsVisibility>>

export const changeOpenForRequestsVisibility = ({
  body,
  method,
  user,
}: {
  body: unknown
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('openForRequests', ({ user }) => isOpenForRequests(user.orcid)),
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
          .with({ openForRequests: { value: false } }, () =>
            RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          )
          .with({ method: 'POST', openForRequests: { value: true } }, handleChangeOpenForRequestsVisibilityForm)
          .with({ openForRequests: { value: true } }, state => RT.of(createFormPage(state)))
          .exhaustive(),
    ),
  )

const ChangeOpenForRequestsVisibilityFormD = pipe(
  D.struct({ openForRequestsVisibility: D.literal('public', 'restricted') }),
)

const handleChangeOpenForRequestsVisibilityForm = ({
  body,
  openForRequests,
  user,
}: {
  body: unknown
  openForRequests: Extract<IsOpenForRequests, { value: true }>
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeOpenForRequestsVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ openForRequestsVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ openForRequestsVisibility }) => ({ ...openForRequests, visibility: openForRequestsVisibility }),
        openForRequests => saveOpenForRequests(user.orcid, openForRequests),
        RTE.matchW(
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

function createFormPage({ openForRequests }: { openForRequests: Extract<IsOpenForRequests, { value: true }> }) {
  return PageResponse({
    title: plainText`Who can see if you are open for review requests?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
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
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsVisibilityMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
