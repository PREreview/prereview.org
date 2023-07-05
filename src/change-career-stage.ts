import { format } from 'fp-ts-routing'
import * as b from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { canEditProfile } from './feature-flags'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, notFound, serviceUnavailable } from './middleware'
import { page } from './page'
import { changeCareerStageMatch, myDetailsMatch } from './routes'
import { type User, getUser } from './user'

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
      .with('POST', () => serviceUnavailable)
      .otherwise(() => showChangeCareerStageForm(state.user)),
  ),
  RM.orElseW(() => logInAndRedirect(myDetailsMatch.formatter, {})),
)

const showChangeCareerStageForm = (user: User) =>
  pipe(
    RM.rightReader(createFormPage(user)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
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
