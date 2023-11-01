import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText, sendHtml } from './html'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import { type User, maybeGetUser } from './user'

export const howToUse = pipe(
  RM.fromReaderTaskEither(getPage('651d895e07fb34a92c7f8d28')),
  RM.bindTo('content'),
  RM.apSW('user', maybeGetUser),
  RM.chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(() => serviceUnavailable),
)

function createPage({ content, user }: { content: Html; user?: User }) {
  return page({
    title: plainText`How to use PREreview`,
    content: html`
      <main id="main-content">
        <h1>How to use PREreview</h1>

        ${fixHeadingLevels(1, content)}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    current: 'how-to-use',
    user,
  })
}
