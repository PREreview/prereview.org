import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import * as b from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { canEditProfile } from './feature-flags'
import { html, plainText, rawHtml, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, notFound, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { changeCareerStageMatch, myDetailsMatch } from './routes'
import { type GetUserEnv, type User, getUser } from './user'

export interface SaveCareerStageEnv {
  saveCareerStage: (orcid: Orcid, careerStage: 'early' | 'mid' | 'late') => TE.TaskEither<'unavailable', void>
}

const saveCareerStage = (orcid: Orcid, careerStage: 'early' | 'mid' | 'late') =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveCareerStage }: SaveCareerStageEnv) => saveCareerStage(orcid, careerStage)),
  )

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
      .with('POST', () => handleChangeCareerStageForm(state.user))
      .otherwise(() => showChangeCareerStageForm(state.user)),
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

const showChangeCareerStageForm = (user: User) =>
  pipe(
    RM.rightReader(createFormPage(user)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showChangeCareerStageErrorForm = (user: User) =>
  pipe(
    RM.rightReader(createFormPage(user, true)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeCareerStageFormD = pipe(D.struct({ careerStage: D.literal('early', 'mid', 'late', 'skip') }))

const handleChangeCareerStageForm = (user: User) =>
  pipe(
    RM.decodeBody(body => ChangeCareerStageFormD.decode(body)),
    RM.ichainW(({ careerStage }) =>
      match(careerStage)
        .returnType<
          RM.ReaderMiddleware<
            FathomEnv & GetUserEnv & PhaseEnv & SaveCareerStageEnv,
            StatusOpen,
            ResponseEnded,
            'unavailable',
            void
          >
        >()
        .with(P.union('early', 'mid', 'late'), careerStage =>
          pipe(
            RM.fromReaderTaskEither(saveCareerStage(user.orcid, careerStage)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
          ),
        )
        .with('skip', () => serviceUnavailable)
        .exhaustive(),
    ),
    RM.orElseW(() => showChangeCareerStageErrorForm(user)),
  )

function createFormPage(user: User, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}What career stage are you at?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeCareerStageMatch.formatter, {})}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#career-stage-early"> Select which career stage you are at </a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${error ? rawHtml('class="error"') : ''}>
            <fieldset
              role="group"
              ${error ? rawHtml('aria-invalid="true" aria-errormessage="career-stage-error"') : ''}
            >
              <legend>
                <h1>What career stage are you at?</h1>
              </legend>

              ${error
                ? html`
                    <div class="error-message" id="career-stage-error">
                      <span class="visually-hidden">Error:</span>
                      Select which career stage you are at
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input name="careerStage" type="radio" value="early" id="career-stage-early" />
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
