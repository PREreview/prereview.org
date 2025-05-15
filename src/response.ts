import { Schema, Struct, flow, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { type HeadersOpen, MediaType, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { type OAuthEnv, requestAuthorizationCode } from 'hyper-ts-oauth'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { deleteFlashMessage, getFlashMessage, setFlashMessage } from './flash-message.js'
import { type Html, html, rawHtml } from './html.js'
import { type SupportedLocale, translate } from './locales/index.js'
import type { OrcidOAuthEnv } from './log-in/index.js'
import { showNotificationBanner } from './notification-banner.js'
import { type Page, type TemplatePageEnv, templatePage } from './page.js'
import { type PublicUrlEnv, toUrl } from './public-url.js'
import type * as Router from './Router/index.js'
import { orcidCodeMatch } from './routes.js'
import { isCacheable } from './status-code.js'
import { type GetUserOnboardingEnv, type UserOnboarding, maybeGetUserOnboarding } from './user-onboarding.js'
import type { User } from './user.js'

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
  readonly extraSkipLink?: [Html, string]
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
  readonly description?: Page['description']
  readonly h1: Html
  readonly aside: Html
  readonly main: Html
}

export interface RedirectResponse {
  readonly _tag: 'RedirectResponse'
  readonly status: typeof Status.SeeOther | typeof Status.Found | typeof Status.MovedPermanently
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

export function handleResponse({
  response,
  user,
  locale,
}: {
  response: Response
  user?: User
  locale: SupportedLocale
}): RM.ReaderMiddleware<
  GetUserOnboardingEnv & OrcidOAuthEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> {
  return match({ response, user, locale })
    .with({ response: { _tag: 'PageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'StreamlinePageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'TwoUpPageResponse' } }, handleTwoUpPageResponse)
    .with({ response: { _tag: 'RedirectResponse' } }, RM.fromMiddlewareK(handleRedirectResponse))
    .with({ response: { _tag: 'FlashMessageResponse' } }, RM.fromMiddlewareK(handleFlashMessageResponse))
    .with({ response: { _tag: 'LogInResponse' } }, handleLogInResponse)
    .exhaustive()
}

export const FlashMessageSchema = Schema.Literal(
  'logged-out',
  'logged-in',
  'blocked',
  'verify-contact-email',
  'verify-contact-email-resend',
  'contact-email-verified',
  'orcid-connected',
  'orcid-disconnected',
  'slack-connected',
  'slack-disconnected',
  'avatar-changed',
  'avatar-removed',
)

const FlashMessageD = D.literal(...FlashMessageSchema.literals)

export const toPage = ({
  locale,
  message,
  userOnboarding,
  pageUrls,
  response,
  user,
}: {
  locale: SupportedLocale
  message?: D.TypeOf<typeof FlashMessageD>
  userOnboarding?: UserOnboarding
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse
  pageUrls?: Router.PageUrls
  user?: User | undefined
}): Page =>
  response._tag === 'TwoUpPageResponse'
    ? {
        locale,
        title: response.title,
        description: response.description,
        content: html`
          <h1 class="visually-hidden">${response.h1}</h1>

          <aside id="preprint-details" tabindex="0" aria-label="Preprint details">${response.aside}</aside>

          <main id="prereviews">${message ? showFlashMessage(message, locale) : ''} ${response.main}</main>
        `,
        skipLinks: [
          [html`Skip to preprint details`, '#preprint-details'],
          [html`Skip to PREreviews`, '#prereviews'],
        ],
        js: message ? (['notification-banner.js'] as const) : [],
        pageUrls,
        type: 'two-up',
        user,
        userOnboarding,
      }
    : {
        locale,
        title: response.title,
        description: response.description,
        content: html`
          ${response.nav ? html` <nav>${response.nav}</nav>` : ''}

          <main id="${response.skipToLabel}">${message ? showFlashMessage(message, locale) : ''}${response.main}</main>
        `,
        skipLinks: [
          [rawHtml(translate(locale, 'skip-links', response.skipToLabel)()), `#${response.skipToLabel}`],
          ...(response._tag === 'PageResponse' && response.extraSkipLink ? [response.extraSkipLink] : []),
        ],
        current: response.current,
        js: response.js.concat(...(message ? (['notification-banner.js'] as const) : [])),
        pageUrls,
        type: response._tag === 'StreamlinePageResponse' ? 'streamline' : undefined,
        user,
        userOnboarding,
      }

export const handlePageResponse = ({
  response,
  user,
  locale,
}: {
  response: PageResponse | StreamlinePageResponse
  user?: User
  locale: SupportedLocale
}): RM.ReaderMiddleware<
  GetUserOnboardingEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> =>
  pipe(
    RM.of({}),
    RM.apS('locale', RM.of(locale)),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.apSW(
      'canonical',
      RM.rightReader(
        match(response.canonical)
          .with(P.string, canonical =>
            R.asks(
              ({ publicUrl }: PublicUrlEnv) =>
                new URL(`${publicUrl.origin}${encodeURI(canonical).replace(/^([^/])/, '/$1')}`).href,
            ),
          )
          .with(undefined, R.of)
          .exhaustive(),
      ),
    ),
    RM.bindW(
      'body',
      RM.fromReaderK(({ locale, userOnboarding, message }) =>
        templatePage(toPage({ locale, userOnboarding, message, response, user })),
      ),
    ),
    RM.ichainFirst(() => RM.status(response.status)),
    RM.ichainFirst(() =>
      !isCacheable(response.status)
        ? RM.header('Cache-Control', 'no-store, must-revalidate')
        : pipe(
            user ? RM.header('Cache-Control', 'no-cache, private') : RM.header('Cache-Control', 'no-cache, public'),
            RM.ichainFirst(() => RM.header('Vary', 'Cookie')),
          ),
    ),
    RM.ichainFirst(() => RM.fromMiddleware(deleteFlashMessage)),
    RM.ichainFirst(props =>
      RM.fromMiddleware(
        match(props.canonical)
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
    RM.ichainMiddlewareK(flow(Struct.get('body'), sendHtml)),
  )

const handleTwoUpPageResponse = ({
  response,
  user,
  locale,
}: {
  response: TwoUpPageResponse
  user?: User
  locale: SupportedLocale
}): RM.ReaderMiddleware<
  GetUserOnboardingEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> =>
  pipe(
    RM.of({}),
    RM.apS('locale', RM.of(locale)),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.apSW(
      'canonical',
      RM.asks(
        ({ publicUrl }: PublicUrlEnv) =>
          new URL(`${publicUrl.origin}${encodeURI(response.canonical).replace(/^([^/])/, '/$1')}`).href,
      ),
    ),
    RM.bindW(
      'body',
      RM.fromReaderK(({ locale, userOnboarding, message }) =>
        templatePage(
          toPage({
            locale,
            userOnboarding,
            message,
            response,
            user,
          }),
        ),
      ),
    ),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirst(() =>
      user ? RM.header('Cache-Control', 'no-cache, private') : RM.header('Cache-Control', 'no-cache, public'),
    ),
    RM.ichainFirst(() => RM.header('Vary', 'Cookie')),
    RM.ichainFirst(() => RM.fromMiddleware(deleteFlashMessage)),
    RM.ichainFirst(({ canonical }) => RM.header('Link', `<${canonical}>; rel="canonical"`)),
    RM.ichainMiddlewareK(flow(Struct.get('body'), sendHtml)),
  )

const handleRedirectResponse = ({
  response,
  user,
}: {
  response: RedirectResponse
  user?: User
}): M.Middleware<StatusOpen, ResponseEnded, never, void> =>
  pipe(
    M.status(response.status),
    M.ichain(() =>
      !isCacheable(response.status)
        ? M.header('Cache-Control', 'no-store, must-revalidate')
        : user
          ? M.header('Cache-Control', 'no-cache, private')
          : M.header('Cache-Control', 'no-cache, public'),
    ),
    M.ichain(() => M.header('Vary', 'Cookie')),
    M.ichain(() => M.header('Location', response.location.toString())),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

export const handleFlashMessageResponse = ({
  response,
}: {
  response: FlashMessageResponse
}): M.Middleware<StatusOpen, ResponseEnded, never, void> =>
  pipe(
    M.status(Status.SeeOther),
    M.ichain(() => M.header('Location', response.location.toString())),
    M.ichain(() => M.header('Cache-Control', 'no-store, must-revalidate')),
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
    RM.asks(({ publicUrl }: PublicUrlEnv) => new URL(`${publicUrl.origin}${response.location}`).href),
    RM.ichainW(requestAuthorizationCode('/authenticate')),
    R.local(addRedirectUri()),
  )

function showFlashMessage(message: D.TypeOf<typeof FlashMessageD>, locale: SupportedLocale) {
  return match(message)
    .with('logged-out', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageLoggedOut')())}</p>`,
      }),
    )
    .with('logged-in', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageLoggedIn')())}</p>`,
      }),
    )
    .with('blocked', () =>
      showNotificationBanner({
        type: 'failure',
        title: rawHtml(translate(locale, 'flash-messages', 'titleAccessDenied')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageLogInBlocked')())}</p>`,
      }),
    )
    .with('verify-contact-email', () =>
      showNotificationBanner({
        type: 'notice',
        title: rawHtml(translate(locale, 'flash-messages', 'titleImportant')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageVerifyEmail')())}</p>`,
      }),
    )
    .with('verify-contact-email-resend', () =>
      showNotificationBanner({
        type: 'notice',
        title: rawHtml(translate(locale, 'flash-messages', 'titleImportant')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageVerifyEmailResend')())}</p>`,
      }),
    )
    .with('contact-email-verified', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageEmailVerified')())}</p>`,
      }),
    )
    .with('orcid-connected', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageOrcidConnected')())}</p>`,
      }),
    )
    .with('orcid-disconnected', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageOrcidDisconnected')())}</p>`,
      }),
    )
    .with('slack-connected', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageSlackConnected')())}</p>`,
      }),
    )
    .with('slack-disconnected', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageSlackDisconnected')())}</p>`,
      }),
    )
    .with('avatar-changed', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageAvatarChanged')())}</p>`,
      }),
    )
    .with('avatar-removed', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageAvatarRemoved')())}</p>`,
      }),
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

function sendHtml(html: Html): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html.toString())),
  )
}

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
