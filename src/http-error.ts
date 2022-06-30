import { pipe } from 'fp-ts/function'
import http from 'http'
import { HttpError } from 'http-errors'
import * as H from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { html, plainText, sendHtml } from './html'
import { page } from './page'

export function handleError<N extends H.Status>(error: HttpError<N>) {
  return pipe(
    M.status(error.status),
    M.ichain(() => M.header('Cache-Control', 'no-store, must-revalidate')),
    M.ichain(() => pipe(http.STATUS_CODES[error.status] ?? 'Error', errorPage, sendHtml)),
  )
}

function errorPage(message: string) {
  return page({
    title: plainText`${message}`,
    content: html`
      <main>
        <h1>${message}</h1>
      </main>
    `,
  })
}
