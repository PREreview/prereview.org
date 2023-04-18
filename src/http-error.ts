import { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { HttpError } from 'http-errors'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { page } from './page'
import { User, getUser } from './user'

export function handleError(error: HttpError<typeof Status.NotFound | typeof Status.ServiceUnavailable>) {
  return pipe(
    getUser,
    RM.orElseW(() => RM.of(undefined)),
    chainReaderKW(
      match(error)
        .with({ status: Status.NotFound }, () => notFoundPage)
        .with({ status: Status.ServiceUnavailable }, () => problemsPage)
        .exhaustive(),
    ),
    RM.ichainFirst(() => RM.status(error.status)),
    RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
    RM.ichainMiddlewareK(sendHtml),
  )
}

function notFoundPage(user?: User) {
  return page({
    title: plainText`Page not found`,
    content: html`
      <main id="main-content">
        <h1>Page not found</h1>

        <p>If you typed the web address, check it is correct.</p>

        <p>If you pasted the web address, check you copied the entire address.</p>

        <p>
          If the web address is correct or you selected a link or button, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function problemsPage(user?: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>Please try again later.</p>
      </main>
    `,
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
