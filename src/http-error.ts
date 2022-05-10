import { pipe } from 'fp-ts/function'
import http from 'http'
import { HttpError } from 'http-errors'
import * as H from 'hyper-ts'
import { MediaType } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'

export function handleError<N extends H.Status>(error: HttpError<N>) {
  return pipe(
    M.status(error.status),
    M.ichain(() => M.header('cache-control', 'no-store, must-revalidate')),
    M.ichain(() => M.contentType(MediaType.textHTML)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => pipe(http.STATUS_CODES[error.status] ?? 'Error', errorPage, M.send)),
  )
}

function errorPage(message: string) {
  return `
<!DOCTYPE html>

<html lang="en">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <link href="/style.css" rel="stylesheet" />

  <title>${message}</title>

  <main>
    <h1>${message}</h1>
  </main>
</html>
`
}
