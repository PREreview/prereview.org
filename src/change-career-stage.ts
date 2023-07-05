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
import { myDetailsMatch } from './routes'
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
    title: plainText`Change career stage`,
    content: html` <p>Form</p> `,
    user,
  })
}
