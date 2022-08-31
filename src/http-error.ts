import { pipe } from 'fp-ts/function'
import http from 'http'
import { HttpError } from 'http-errors'
import * as H from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { html, plainText, sendHtml } from './html'
import { page } from './page'

export function handleError<N extends H.Status>(error: HttpError<N>) {
  return pipe(
    RM.rightReader(pipe(http.STATUS_CODES[error.status] ?? 'Error', errorPage)),
    RM.ichainFirst(() => RM.status(error.status)),
    RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
    RM.ichainMiddlewareK(sendHtml),
  )
}

function errorPage(message: string) {
  return page({
    title: plainText(message),
    content: html`
      <main>
        <h1>${message}</h1>
      </main>
    `,
  })
}
