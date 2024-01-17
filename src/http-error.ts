import { pipe } from 'fp-ts/function'
import type { HttpError } from 'http-errors'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import { page } from './page'
import { PageResponse } from './response'
import { type User, maybeGetUser } from './user'

export function handleError(error: HttpError<typeof Status.NotFound | typeof Status.ServiceUnavailable>) {
  return pipe(
    maybeGetUser,
    RM.chainReaderKW(
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

export const pageNotFound = PageResponse({
  status: Status.NotFound,
  title: plainText`Page not found`,
  main: html`
    <h1>Page not found</h1>

    <p>If you typed the web address, check it is correct.</p>

    <p>If you pasted the web address, check you copied the entire address.</p>

    <p>
      If the web address is correct or you selected a link or button, please
      <a href="mailto:help@prereview.org">get in touch</a>.
    </p>
  `,
})

export const havingProblemsPage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>Please try again later.</p>
  `,
})

export const noPermissionPage = PageResponse({
  status: Status.Forbidden,
  title: plainText`You do not have permission to view this page`,
  main: html`
    <h1>You do not have permission to view this page</h1>

    <p>If you think you should have access, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
  `,
})
