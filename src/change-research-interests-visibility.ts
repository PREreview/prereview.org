import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { type ResearchInterests, getResearchInterests, saveResearchInterests } from './research-interests'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from './routes'
import { type GetUserEnv, type User, getUser } from './user'

export const changeResearchInterestsVisibility = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.bindW(
    'researchInterests',
    RM.fromReaderTaskEitherK(({ user }) => getResearchInterests(user.orcid)),
  ),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeResearchInterestsVisibilityForm(state.user, state.researchInterests))
      .otherwise(() => showChangeResearchInterestsVisibilityForm(state.user, state.researchInterests)),
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
        fromMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
      )
      .with('no-session', () => logInAndRedirect(myDetailsMatch.formatter, {}))
      .with(P.union('unavailable', P.instanceOf(Error)), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showChangeResearchInterestsVisibilityForm = (user: User, researchInterests: ResearchInterests) =>
  pipe(
    RM.rightReader(createFormPage(user, researchInterests)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeResearchInterestsVisibilityFormD = pipe(
  D.struct({ researchInterestsVisibility: D.literal('public', 'restricted') }),
)

const handleChangeResearchInterestsVisibilityForm = (user: User, researchInterests: ResearchInterests) =>
  pipe(
    RM.decodeBody(body => ChangeResearchInterestsVisibilityFormD.decode(body)),
    RM.orElseW(() => RM.of({ researchInterestsVisibility: 'restricted' as const })),
    RM.ichainW(
      flow(
        ({ researchInterestsVisibility }) => ({ ...researchInterests, visibility: researchInterestsVisibility }),
        RM.fromReaderTaskEitherK(researchInterests => saveResearchInterests(user.orcid, researchInterests)),
        RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
  )

function createFormPage(user: User, researchInterests: ResearchInterests) {
  return page({
    title: plainText`Who can see your research interests?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
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
                <p id="research-interests-visibility-tip-restricted" role="note">
                  We won’t share them with anyone else.
                </p>
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

// https://github.com/DenisFrezzato/hyper-ts/pull/83
function fromMiddlewareK<R, A extends ReadonlyArray<unknown>, B, I, O, E>(
  f: (...a: A) => M.Middleware<I, O, E, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, O, E, B> {
  return (...a) => RM.fromMiddleware(f(...a))
}
