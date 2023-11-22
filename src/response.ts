import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { type HeadersOpen, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { type OAuthEnv, requestAuthorizationCode } from 'hyper-ts-oauth'
import * as M from 'hyper-ts/Middleware'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { deleteFlashMessage, getFlashMessage } from './flash-message'
import { type Html, html, sendHtml } from './html'
import { type Page, type TemplatePageEnv, templatePage } from './page'
import type { PublicUrlEnv } from './public-url'
import type { User } from './user'
import { type GetUserOnboardingEnv, maybeGetUserOnboarding } from './user-onboarding'

export type Response = PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse

export interface PageResponse {
  readonly _tag: 'PageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: Status
  readonly title: Page['title']
  readonly nav?: Html
  readonly main: Html
  readonly skipToLabel: 'form' | 'main' | 'prereview'
  readonly js: Required<Page>['js']
}

export interface StreamlinePageResponse {
  readonly _tag: 'StreamlinePageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: Status
  readonly title: Page['title']
  readonly nav?: Html
  readonly main: Html
  readonly skipToLabel: 'form' | 'main'
  readonly js: Required<Page>['js']
}

export interface RedirectResponse {
  readonly _tag: 'RedirectResponse'
  readonly status: typeof Status.SeeOther | typeof Status.Found
  readonly location: URL | string
}

export interface LogInResponse {
  readonly _tag: 'LogInResponse'
  readonly location: string
}

export const PageResponse = (
  args: Optional<Omit<PageResponse, '_tag'>, 'status' | 'js' | 'skipToLabel'>,
): PageResponse => ({
  _tag: 'PageResponse',
  status: Status.OK,
  js: RA.empty,
  skipToLabel: 'main',
  ...args,
})

export const StreamlinePageResponse = (
  args: Optional<Omit<StreamlinePageResponse, '_tag'>, 'status' | 'js' | 'skipToLabel'>,
): StreamlinePageResponse => ({
  _tag: 'StreamlinePageResponse',
  status: Status.OK,
  js: RA.empty,
  skipToLabel: 'main',
  ...args,
})

export const RedirectResponse = (
  args: Omit<RedirectResponse, '_tag' | 'status'> & Partial<Pick<RedirectResponse, 'status'>>,
): RedirectResponse => ({
  _tag: 'RedirectResponse',
  status: Status.SeeOther,
  ...args,
})

export const LogInResponse = (args: Omit<LogInResponse, '_tag'>): LogInResponse => ({
  _tag: 'LogInResponse',
  ...args,
})

export function handleResponse(response: {
  response: Response
  user?: User
}): RM.ReaderMiddleware<
  GetUserOnboardingEnv & OAuthEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> {
  return match(response)
    .with({ response: { _tag: 'PageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'StreamlinePageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'RedirectResponse' } }, RM.fromMiddlewareK(handleRedirectResponse))
    .with({ response: { _tag: 'LogInResponse' } }, handleLogInResponse)
    .exhaustive()
}

const handlePageResponse = ({
  response,
  user,
}: {
  response: PageResponse | StreamlinePageResponse
  user?: User
}): RM.ReaderMiddleware<GetUserOnboardingEnv & TemplatePageEnv, StatusOpen, ResponseEnded, never, void> =>
  pipe(
    RM.of({}),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(D.literal('logged-out', 'logged-in', 'blocked')))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.chainReaderKW(({ message, userOnboarding }) =>
      templatePage({
        title: response.title,
        content: html`
          ${response.nav ? html` <nav>${response.nav}</nav>` : ''}

          <main id="${response.skipToLabel}">
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
        skipLinks: [
          [
            match(response.skipToLabel)
              .with('form', () => html`Skip to form`)
              .with('main', () => html`Skip to main content`)
              .with('prereview', () => html`Skip to PREreview`)
              .exhaustive(),
            `#${response.skipToLabel}`,
          ],
        ],
        current: response.current,
        js: response.js.concat(...(message ? (['notification-banner.js'] as const) : [])),
        type: response._tag === 'StreamlinePageResponse' ? 'streamline' : undefined,
        user,
        userOnboarding,
      }),
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

const handleRedirectResponse = ({
  response,
}: {
  response: RedirectResponse
}): M.Middleware<StatusOpen, ResponseEnded, never, void> =>
  pipe(
    M.status(response.status),
    M.ichain(() => M.header('Location', response.location.toString())),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

const handleLogInResponse = ({
  response,
}: {
  response: LogInResponse
}): RM.ReaderMiddleware<OAuthEnv & PublicUrlEnv, StatusOpen, ResponseEnded, never, void> =>
  pipe(
    RM.asks(({ publicUrl }: PublicUrlEnv) => new URL(response.location, publicUrl).href),
    RM.ichainW(requestAuthorizationCode('/authenticate')),
  )

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
