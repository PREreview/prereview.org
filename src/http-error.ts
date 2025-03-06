import { Effect, pipe } from 'effect'
import type { HttpError } from 'http-errors'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { match } from 'ts-pattern'
import { Locale } from './Context.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { html, plainText, rawHtml, sendHtml } from './html.js'
import { DefaultLocale, type SupportedLocale, translate } from './locales/index.js'
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
    title: plainText(translate(DefaultLocale, 'page-not-found', 'pageNotFoundTitle')()),
    content: html`
      <main id="main-content">
        <h1>${translate(DefaultLocale, 'page-not-found', 'pageNotFoundTitle')()}</h1>

        <p>${translate(DefaultLocale, 'page-not-found', 'checkCorrect')()}</p>

        <p>${translate(DefaultLocale, 'page-not-found', 'checkEntire')()}</p>

        <p>
          ${rawHtml(
            translate(
              DefaultLocale,
              'page-not-found',
              'contactUs',
            )({ contact: text => html`<a href="mailto:help@prereview.org">${text}</a>`.toString() }),
          )}
        </p>
      </main>
    `,
    skipLinks: [[html`${translate(DefaultLocale, 'skip-links', 'main')()}`, '#main-content']],
    user,
  })
}

function problemsPage(user?: User) {
  return templatePage({
    title: plainText(translate(DefaultLocale, 'having-problems-page', 'havingProblemsTitle')()),
    content: html`
      <main id="main-content">
        <h1>${translate(DefaultLocale, 'having-problems-page', 'havingProblemsTitle')()}</h1>

        <p>${translate(DefaultLocale, 'having-problems-page', 'tryAgainLater')()}</p>
      </main>
    `,
    skipLinks: [[html`${translate(DefaultLocale, 'skip-links', 'main')()}`, '#main-content']],
    user,
  })
}

/** @deprecated */
export const pageNotFound = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(PageNotFound, Locale, locale))

/** @deprecated */
export const havingProblemsPage = (locale: SupportedLocale) =>
  Effect.runSync(Effect.provideService(HavingProblemsPage, Locale, locale))

/** @deprecated */
export const noPermissionPage = Effect.runSync(Effect.provideService(NoPermissionPage, Locale, DefaultLocale))
