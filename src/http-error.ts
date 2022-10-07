import { pipe } from 'fp-ts/function'
import http from 'http'
import { HttpError, NotFound, ServiceUnavailable } from 'http-errors'
import * as H from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { page } from './page'

export function handleError<N extends H.Status>(error: HttpError<N>) {
  return pipe(
    RM.rightReader(
      match(error)
        .with(P.instanceOf(NotFound), notFoundPage)
        .with(P.instanceOf(ServiceUnavailable), problemsPage)
        .otherwise(genericErrorPage),
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
      <main>
        <h1>Page not found</h1>

        <p>If you typed the web address, check it is correct.</p>

        <p>If you pasted the web address, check you copied the entire address.</p>
      </main>
    `,
  })
}

function problemsPage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main>
        <h1>Sorry, we’re having problems</h1>

        <p>Please try again later.</p>
      </main>
    `,
  })
}

function genericErrorPage<N extends H.Status>(error: HttpError<N>) {
  const message = http.STATUS_CODES[error.status] ?? 'Error'

  return page({
    title: plainText(message),
    content: html`
      <main>
        <h1>${message}</h1>
      </main>
    `,
  })
}
