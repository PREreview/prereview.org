import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { getPage } from './ghost'
import { type Html, html, plainText, sendHtml } from './html'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import { type User, getUser } from './user'

export const privacyPolicy = pipe(
  RM.fromReaderTaskEither(getPage('6154aa157741400e8722bb0f')),
  RM.bindTo('content'),
  RM.apSW(
    'user',
    pipe(
      getUser,
      RM.orElseW(() => RM.of(undefined)),
    ),
  ),
  chainReaderKW(({ content, user }) => createPage(content, user)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(() => serviceUnavailable),
)

function createPage(content: Html, user?: User) {
  return page({
    title: plainText`Privacy Policy`,
    content: html`
      <main id="main-content">
        <h1>Privacy Policy</h1>

        ${content}
      </main>
    `,
    current: 'privacy-policy',
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
