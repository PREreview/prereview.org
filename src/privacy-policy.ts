import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText, sendHtml } from './html'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import { type User, maybeGetUser } from './user'

export const privacyPolicy = pipe(
  RM.fromReaderTaskEither(getPage('6154aa157741400e8722bb0f')),
  RM.bindTo('content'),
  RM.apSW('user', maybeGetUser),
  RM.chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(() => serviceUnavailable),
)

function createPage({ content, user }: { content: Html; user?: User }) {
  return page({
    title: plainText`Privacy Policy`,
    content: html`
      <main id="main-content">
        <h1>Privacy Policy</h1>

        ${fixHeadingLevels(1, content)}
      </main>
    `,
    current: 'privacy-policy',
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}
