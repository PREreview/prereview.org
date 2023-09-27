import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { type CareerStage, getCareerStage, saveCareerStage } from './career-stage'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from './routes'
import { type GetUserEnv, type User, getUser } from './user'

export const changeCareerStageVisibility = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.bindW(
    'careerStage',
    RM.fromReaderTaskEitherK(({ user }) => getCareerStage(user.orcid)),
  ),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeCareerStageVisibilityForm(state.user, state.careerStage))
      .otherwise(() => showChangeCareerStageVisibilityForm(state.user, state.careerStage)),
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

const showChangeCareerStageVisibilityForm = (user: User, careerStage: CareerStage) =>
  pipe(
    RM.rightReader(createFormPage(user, careerStage)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeCareerStageVisibilityFormD = pipe(D.struct({ careerStageVisibility: D.literal('public', 'restricted') }))

const handleChangeCareerStageVisibilityForm = (user: User, careerStage: CareerStage) =>
  pipe(
    RM.decodeBody(body => ChangeCareerStageVisibilityFormD.decode(body)),
    RM.orElseW(() => RM.of({ careerStageVisibility: 'restricted' as const })),
    RM.ichainW(
      flow(
        ({ careerStageVisibility }) => ({ ...careerStage, visibility: careerStageVisibility }),
        RM.fromReaderTaskEitherK(careerStage => saveCareerStage(user.orcid, careerStage)),
        RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
  )

function createFormPage(user: User, careerStage: CareerStage) {
  return page({
    title: plainText`Who can see your career stage?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeCareerStageVisibilityMatch.formatter, {})}" novalidate>
          <fieldset role="group">
            <legend>
              <h1>Who can see your career stage?</h1>
            </legend>

            <ol>
              <li>
                <label>
                  <input
                    name="careerStageVisibility"
                    id="career-stage-visibility-public"
                    type="radio"
                    value="public"
                    aria-describedby="career-stage-visibility-tip-public"
                    ${match(careerStage.visibility)
                      .with('public', () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Everyone</span>
                </label>
                <p id="career-stage-visibility-tip-public" role="note">We’ll show it on your public profile.</p>
              </li>
              <li>
                <label>
                  <input
                    name="careerStageVisibility"
                    id="career-stage-visibility-restricted"
                    type="radio"
                    value="restricted"
                    aria-describedby="career-stage-visibility-tip-restricted"
                    ${match(careerStage.visibility)
                      .with('restricted', () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Only PREreview</span>
                </label>
                <p id="career-stage-visibility-tip-restricted" role="note">We won’t share it with anyone else.</p>
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
