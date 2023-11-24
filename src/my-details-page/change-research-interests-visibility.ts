import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { type ResearchInterests, getResearchInterests, saveResearchInterests } from '../research-interests'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

export type Env = EnvFor<ReturnType<typeof changeResearchInterestsVisibility>>

export const changeResearchInterestsVisibility = ({
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
    RTE.bindW('researchInterests', ({ user }) => getResearchInterests(user.orcid)),
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
          .with({ method: 'POST' }, handleChangeResearchInterestsVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeResearchInterestsVisibilityFormD = pipe(
  D.struct({ researchInterestsVisibility: D.literal('public', 'restricted') }),
)

const handleChangeResearchInterestsVisibilityForm = ({
  body,
  researchInterests,
  user,
}: {
  body: unknown
  researchInterests: ResearchInterests
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeResearchInterestsVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ researchInterestsVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ researchInterestsVisibility }) => ({ ...researchInterests, visibility: researchInterestsVisibility }),
        researchInterests => saveResearchInterests(user.orcid, researchInterests),
        RTE.matchW(
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

function createFormPage({ researchInterests }: { researchInterests: ResearchInterests }) {
  return PageResponse({
    title: plainText`Who can see your research interests?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeResearchInterestsVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your research interests?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="researchInterestsVisibility"
                  id="research-interests-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="research-interests-visibility-tip-public"
                  ${match(researchInterests.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="research-interests-visibility-tip-public" role="note">We’ll show them on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="researchInterestsVisibility"
                  id="research-interests-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="research-interests-visibility-tip-restricted"
                  ${match(researchInterests.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="research-interests-visibility-tip-restricted" role="note">We won’t share them with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
