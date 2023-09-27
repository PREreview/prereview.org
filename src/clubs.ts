import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { getPage } from './ghost'
import { type Html, html, plainText, sendHtml } from './html'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import { type User, maybeGetUser } from './user'

export const clubs = pipe(
  RM.fromReaderTaskEither(getPage('64637b4c07fb34a92c7f84ec')),
  RM.bindTo('content'),
  RM.apSW('user', maybeGetUser),
  RM.chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(() => serviceUnavailable),
)

function createPage({ content, user }: { content: Html; user?: User }) {
  return page({
    title: plainText`Clubs`,
    content: html`
      <main id="main-content">
        <h1>Clubs</h1>

        ${content}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    current: 'clubs',
    user,
  })
}
