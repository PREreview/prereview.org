import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { getPage } from './ghost'
import { type Html, fixHeadingLevels, html, plainText, sendHtml } from './html'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import { type User, maybeGetUser } from './user'

export const codeOfConduct = pipe(
  RM.fromReaderTaskEither(getPage('6154aa157741400e8722bb00')),
  RM.bindTo('content'),
  RM.apSW('user', maybeGetUser),
  RM.chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(() => serviceUnavailable),
)

function createPage({ content, user }: { content: Html; user?: User }) {
  return page({
    title: plainText`Code of Conduct`,
    content: html`
      <main id="main-content">
        <h1>Code of Conduct</h1>

        ${fixHeadingLevels(1, content)}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    current: 'code-of-conduct',
    user,
  })
}
