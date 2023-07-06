import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as b from 'fp-ts/boolean'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { canEditProfile } from './feature-flags'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, notFound, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { changeCareerStageMatch, myDetailsMatch } from './routes'
import { type GetUserEnv, type User, getUser } from './user'

export const changeCareerStage = pipe(
  RM.rightReader(canEditProfile),
  RM.ichainW(
    b.match(
      () => notFound,
      () => showChangeCareerStage,
    ),
  ),
)

const showChangeCareerStage = pipe(
  getUser,
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeCareerStageForm)
      .otherwise(() => showChangeCareerStageForm(state.user)),
  ),
  RM.orElse(error =>
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

const showChangeCareerStageForm = flow(
  fromReaderK(createFormPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const ChangeCareerStageFormD = pipe(D.struct({ careerStage: D.literal('early', 'mid', 'late', 'skip') }))

const handleChangeCareerStageForm = pipe(
  RM.decodeBody(body => ChangeCareerStageFormD.decode(body)),
  RM.ichainW(() => serviceUnavailable),
  RM.orElse(() => serviceUnavailable),
)

function createFormPage(user: User) {
  return page({
    title: plainText`What career stage are you at?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeCareerStageMatch.formatter, {})}" novalidate>
          <fieldset role="group">
            <legend>
              <h1>What career stage are you at?</h1>
            </legend>

            <ol>
              <li>
                <label>
                  <input name="careerStage" type="radio" value="early" />
                  <span>Early</span>
                </label>
              </li>
              <li>
                <label>
                  <input name="careerStage" type="radio" value="mid" />
                  <span>Mid</span>
                </label>
              </li>
              <li>
                <label>
                  <input name="careerStage" type="radio" value="late" />
                  <span>Late</span>
                </label>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input name="careerStage" type="radio" value="skip" />
                  <span>Prefer not to say</span>
                </label>
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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
