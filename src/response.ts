import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { type HeadersOpen, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { deleteFlashMessage, getFlashMessage } from './flash-message'
import { type Html, html, sendHtml } from './html'
import type { Page, TemplatePageEnv } from './page'
import type { User } from './user'
import { type GetUserOnboardingEnv, maybeGetUserOnboarding } from './user-onboarding'

export type Response = PageResponse

export interface PageResponse {
  readonly _tag: 'PageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: Status
  readonly title: Page['title']
  readonly main: Html
  readonly js: Required<Page>['js']
}

export const PageResponse = (args: Optional<Omit<PageResponse, '_tag'>, 'status' | 'js'>): PageResponse => ({
  _tag: 'PageResponse',
  status: Status.OK,
  js: RA.empty,
  ...args,
})

export const handleResponse = (response: {
  canonical?: string
  current?: Page['current']
  response: Response
  user?: User
}): RM.ReaderMiddleware<GetUserOnboardingEnv & TemplatePageEnv, StatusOpen, ResponseEnded, never, void> =>
  match(response)
    .with({ response: { _tag: 'PageResponse' } }, handlePageResponse)
    .exhaustive()

const handlePageResponse = ({
  response,
  user,
}: {
  response: PageResponse
  user?: User
}): RM.ReaderMiddleware<GetUserOnboardingEnv & TemplatePageEnv, StatusOpen, ResponseEnded, never, void> =>
  pipe(
    RM.of({}),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(D.literal('logged-out', 'logged-in', 'blocked')))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.chainW(({ message, userOnboarding }) =>
      RM.asks(({ templatePage }: TemplatePageEnv) =>
        templatePage({
          title: response.title,
          content: html`
            <main id="main">
              ${match(message)
                .with(
                  'logged-out',
                  () => html`
                    <notification-banner aria-labelledby="notification-banner-title" role="alert">
                      <h2 id="notification-banner-title">Success</h2>

                      <p>You have been logged out.</p>
                    </notification-banner>
                  `,
                )
                .with(
                  'logged-in',
                  () => html`
                    <notification-banner aria-labelledby="notification-banner-title" role="alert">
                      <h2 id="notification-banner-title">Success</h2>

                      <p>You have been logged in.</p>
                    </notification-banner>
                  `,
                )
                .with(
                  'blocked',
                  () => html`
                    <notification-banner aria-labelledby="notification-banner-title" type="failure" role="alert">
                      <h2 id="notification-banner-title">Access denied</h2>

                      <p>You are not allowed to log in.</p>
                    </notification-banner>
                  `,
                )
                .with(undefined, () => '')
                .exhaustive()}
              ${response.main}
            </main>
          `,
          skipLinks: [[html`Skip to main content`, '#main']],
          current: response.current,
          js: response.js.concat(...(message ? (['notification-banner.js'] as const) : [])),
          user,
          userOnboarding,
        }),
      ),
    ),
    RM.ichainFirst(() => RM.status(response.status)),
    RM.ichainFirst(() => RM.fromMiddleware(deleteFlashMessage)),
    RM.ichainFirst(() =>
      RM.fromMiddleware(
        match(response.canonical)
          .with(P.string, canonical => M.header('Link', `<${canonical}>; rel="canonical"`))
          .with(undefined, M.of<HeadersOpen>)
          .exhaustive(),
      ),
    ),
    RM.ichainMiddlewareK(sendHtml),
  )

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
