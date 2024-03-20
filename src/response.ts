import * as R from 'fp-ts/Reader'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { type HeadersOpen, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { type OAuthEnv, requestAuthorizationCode } from 'hyper-ts-oauth'
import * as M from 'hyper-ts/Middleware'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { deleteFlashMessage, getFlashMessage, setFlashMessage } from './flash-message.js'
import { type Html, html, sendHtml } from './html.js'
import type { OrcidOAuthEnv } from './log-in.js'
import { type Page, type TemplatePageEnv, templatePage } from './page.js'
import { type PublicUrlEnv, toUrl } from './public-url.js'
import { orcidCodeMatch } from './routes.js'
import type { User } from './user.js'
import { type GetUserOnboardingEnv, maybeGetUserOnboarding } from './user-onboarding.js'

export type Response =
  | PageResponse
  | StreamlinePageResponse
  | TwoUpPageResponse
  | RedirectResponse
  | FlashMessageResponse
  | LogInResponse

export interface PageResponse {
  readonly _tag: 'PageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: Status
  readonly title: Page['title']
  readonly description?: Page['description']
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
  readonly description?: Page['description']
  readonly nav?: Html
  readonly main: Html
  readonly skipToLabel: 'form' | 'main'
  readonly js: Required<Page>['js']
  readonly allowRobots?: false
}

export interface TwoUpPageResponse {
  readonly _tag: 'TwoUpPageResponse'
  readonly canonical: string
  readonly title: Page['title']
  readonly description: Page['description']
  readonly h1: Html
  readonly aside: Html
  readonly main: Html
}

export interface RedirectResponse {
  readonly _tag: 'RedirectResponse'
  readonly status: typeof Status.SeeOther | typeof Status.Found
  readonly location: URL | string
}

export interface FlashMessageResponse {
  readonly _tag: 'FlashMessageResponse'
  readonly location: string
  readonly message: string
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

export const TwoUpPageResponse = (args: Omit<TwoUpPageResponse, '_tag'>): TwoUpPageResponse => ({
  _tag: 'TwoUpPageResponse',
  ...args,
})

export const RedirectResponse = (
  args: Omit<RedirectResponse, '_tag' | 'status'> & Partial<Pick<RedirectResponse, 'status'>>,
): RedirectResponse => ({
  _tag: 'RedirectResponse',
  status: Status.SeeOther,
  ...args,
})

export const FlashMessageResponse = (args: Omit<FlashMessageResponse, '_tag'>): FlashMessageResponse => ({
  _tag: 'FlashMessageResponse',
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
  GetUserOnboardingEnv & OrcidOAuthEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> {
  return match(response)
    .with({ response: { _tag: 'PageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'StreamlinePageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'TwoUpPageResponse' } }, handleTwoUpPageResponse)
    .with({ response: { _tag: 'RedirectResponse' } }, RM.fromMiddlewareK(handleRedirectResponse))
    .with({ response: { _tag: 'FlashMessageResponse' } }, RM.fromMiddlewareK(handleFlashMessageResponse))
    .with({ response: { _tag: 'LogInResponse' } }, handleLogInResponse)
    .exhaustive()
}

const FlashMessageD = D.literal(
  'logged-out',
  'logged-in',
  'blocked',
  'verify-contact-email',
  'contact-email-verified',
  'orcid-connected',
  'orcid-disconnected',
  'slack-connected',
  'slack-disconnected',
)

export const handlePageResponse = ({
  response,
  user,
}: {
  response: PageResponse | StreamlinePageResponse
  user?: User
}): RM.ReaderMiddleware<GetUserOnboardingEnv & TemplatePageEnv, StatusOpen, ResponseEnded, never, void> =>
  pipe(
    RM.of({}),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.chainReaderKW(({ message, userOnboarding }) =>
      templatePage({
        title: response.title,
        description: response.description,
        content: html`
          ${response.nav ? html` <nav>${response.nav}</nav>` : ''}

          <main id="${response.skipToLabel}">${message ? showFlashMessage(message) : ''} ${response.main}</main>
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
    RM.ichainFirst(() =>
      RM.fromMiddleware(
        match(response._tag === 'StreamlinePageResponse' ? response.allowRobots : undefined)
          .with(false, () => M.header('X-Robots-Tag', 'none, noarchive'))
          .with(undefined, M.of<HeadersOpen>)
          .exhaustive(),
      ),
    ),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleTwoUpPageResponse = ({
  response,
  user,
}: {
  response: TwoUpPageResponse
  user?: User
}): RM.ReaderMiddleware<GetUserOnboardingEnv & TemplatePageEnv, StatusOpen, ResponseEnded, never, void> =>
  pipe(
    RM.of({}),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.chainReaderKW(({ message, userOnboarding }) =>
      templatePage({
        title: response.title,
        description: response.description,
        content: html`
          <h1 class="visually-hidden">${response.h1}</h1>

          <aside id="preprint-details" tabindex="0" aria-label="Preprint details">${response.aside}</aside>

          <main id="prereviews">${message ? showFlashMessage(message) : ''} ${response.main}</main>
        `,
        skipLinks: [
          [html`Skip to preprint details`, '#preprint-details'],
          [html`Skip to PREreviews`, '#prereviews'],
        ],
        js: message ? (['notification-banner.js'] as const) : [],
        type: 'two-up',
        user,
        userOnboarding,
      }),
    ),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirst(() => RM.fromMiddleware(deleteFlashMessage)),
    RM.ichainFirst(() => RM.header('Link', `<${response.canonical}>; rel="canonical"`)),
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

const handleFlashMessageResponse = ({
  response,
}: {
  response: FlashMessageResponse
}): M.Middleware<StatusOpen, ResponseEnded, never, void> =>
  pipe(
    M.status(Status.SeeOther),
    M.ichain(() => M.header('Location', response.location.toString())),
    M.ichain(() => setFlashMessage(response.message)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

const handleLogInResponse = ({
  response,
}: {
  response: LogInResponse
}): RM.ReaderMiddleware<OrcidOAuthEnv & PublicUrlEnv, StatusOpen, ResponseEnded, never, void> =>
  pipe(
    RM.asks(({ publicUrl }: PublicUrlEnv) => new URL(response.location, publicUrl).href),
    RM.ichainW(requestAuthorizationCode('/authenticate')),
    R.local(addRedirectUri()),
  )

function showFlashMessage(message: D.TypeOf<typeof FlashMessageD>) {
  return match(message)
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
    .with(
      'verify-contact-email',
      () => html`
        <notification-banner aria-labelledby="notification-banner-title" type="notice" role="alert">
          <h2 id="notification-banner-title">Important</h2>

          <p>We’re sending you an email. Please open it and follow the link to verify your address.</p>
        </notification-banner>
      `,
    )
    .with(
      'contact-email-verified',
      () => html`
        <notification-banner aria-labelledby="notification-banner-title" role="alert">
          <h2 id="notification-banner-title">Success</h2>

          <p>Your email address has been verified.</p>
        </notification-banner>
      `,
    )
    .with(
      'orcid-connected',
      () => html`
        <notification-banner aria-labelledby="notification-banner-title" role="alert">
          <h2 id="notification-banner-title">Success</h2>

          <p>Your ORCID profile has been connected.</p>
        </notification-banner>
      `,
    )
    .with(
      'orcid-disconnected',
      () => html`
        <notification-banner aria-labelledby="notification-banner-title" role="alert">
          <h2 id="notification-banner-title">Success</h2>

          <p>Your ORCID profile has been disconnected.</p>
        </notification-banner>
      `,
    )
    .with(
      'slack-connected',
      () => html`
        <notification-banner aria-labelledby="notification-banner-title" role="alert">
          <h2 id="notification-banner-title">Success</h2>

          <p>Your Community Slack account has been connected.</p>
        </notification-banner>
      `,
    )
    .with(
      'slack-disconnected',
      () => html`
        <notification-banner aria-labelledby="notification-banner-title" role="alert">
          <h2 id="notification-banner-title">Success</h2>

          <p>Your Community Slack account has been disconnected.</p>
        </notification-banner>
      `,
    )
    .exhaustive()
}

function addRedirectUri<R extends OrcidOAuthEnv & PublicUrlEnv>(): (env: R) => R & OAuthEnv {
  return env => ({
    ...env,
    oauth: {
      ...env.orcidOauth,
      redirectUri: pipe(toUrl(orcidCodeMatch.formatter, { code: 'code', state: 'state' })(env), url => {
        url.search = ''

        return url
      }),
    },
  })
}

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
