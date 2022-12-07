import { pipe } from 'fp-ts/function'
import { HttpError } from 'http-errors'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { page } from './page'

export function handleError(error: HttpError<typeof Status.NotFound | typeof Status.ServiceUnavailable>) {
  return pipe(
    RM.rightReader(
      match(error)
        .with({ status: Status.NotFound }, notFoundPage)
        .with({ status: Status.ServiceUnavailable }, problemsPage)
        .exhaustive(),
    ),
    RM.ichainFirst(() => RM.status(error.status)),
    RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
    RM.ichainMiddlewareK(sendHtml),
  )
}

function notFoundPage() {
  return page({
    title: plainText`Page not found`,
    content: html`
      <main id="main-content">
        <h1>Page not found</h1>

        <p>If you typed the web address, check it is correct.</p>

        <p>If you pasted the web address, check you copied the entire address.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function problemsPage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}
