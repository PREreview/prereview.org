import { Effect } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import type { HttpError } from 'http-errors'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { match } from 'ts-pattern'
import { Locale } from './Context.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { html, plainText, sendHtml } from './html.js'
import { DefaultLocale } from './locales/index.js'
import { NoPermissionPage } from './NoPermissionPage/index.js'
import { templatePage } from './page.js'
import { PageNotFound } from './PageNotFound/index.js'
import { type User, maybeGetUser } from './user.js'

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
  return templatePage({
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
  return templatePage({
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

export const pageNotFound = Effect.runSync(Effect.provideService(PageNotFound, Locale, DefaultLocale))

export const havingProblemsPage = Effect.runSync(Effect.provideService(HavingProblemsPage, Locale, DefaultLocale))

export const noPermissionPage = Effect.runSync(NoPermissionPage)
