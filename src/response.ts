import cookie from 'cookie'
import * as R from 'fp-ts/lib/Reader.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RR from 'fp-ts/lib/ReadonlyRecord.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { type HeadersOpen, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { type OAuthEnv, requestAuthorizationCode } from 'hyper-ts-oauth'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { deleteFlashMessage, getFlashMessage, setFlashMessage } from './flash-message.js'
import { type Html, html, rawHtml, sendHtml } from './html.js'
import { DefaultLocale, type SupportedLocale, translate } from './locales/index.js'
import type { OrcidOAuthEnv } from './log-in/index.js'
import { showNotificationBanner } from './notification-banner.js'
import { type Page, type TemplatePageEnv, templatePage } from './page.js'
import { type PublicUrlEnv, toUrl } from './public-url.js'
import { orcidCodeMatch } from './routes.js'
import { isCacheable } from './status-code.js'
import { type GetUserOnboardingEnv, maybeGetUserOnboarding } from './user-onboarding.js'
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
  readonly title: Page['title'] | ((lang: SupportedLocale) => Page['title'])
  readonly description?: Page['description'] | ((lang: SupportedLocale) => Page['description'])
  readonly nav?: Html | ((lang: SupportedLocale) => Html)
  readonly main: Html | ((lang: SupportedLocale) => Html)
  readonly skipToLabel: 'form' | 'main' | 'prereview'
  readonly extraSkipLink?: [Html, string] | ((lang: SupportedLocale) => [Html, string])
  readonly js: Required<Page>['js']
}

export interface StreamlinePageResponse {
  readonly _tag: 'StreamlinePageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: Status
  readonly title: Page['title'] | ((lang: SupportedLocale) => Page['title'])
  readonly description?: Page['description'] | ((lang: SupportedLocale) => Page['description'])
  readonly nav?: Html | ((lang: SupportedLocale) => Html)
  readonly main: Html | ((lang: SupportedLocale) => Html)
  readonly skipToLabel: 'form' | 'main'
  readonly js: Required<Page>['js']
  readonly allowRobots?: false
}

export interface TwoUpPageResponse {
  readonly _tag: 'TwoUpPageResponse'
  readonly canonical: string
  readonly title: Page['title'] | ((lang: SupportedLocale) => Page['title'])
  readonly description?: Page['description'] | ((lang: SupportedLocale) => Page['description'])
  readonly h1: Html | ((lang: SupportedLocale) => Html)
  readonly aside: Html | ((lang: SupportedLocale) => Html)
  readonly main: Html | ((lang: SupportedLocale) => Html)
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
  'avatar-changed',
  'avatar-removed',
)

export const handlePageResponse = ({
  response,
  user,
}: {
  response: PageResponse | StreamlinePageResponse
  user?: User
}): RM.ReaderMiddleware<
  GetUserOnboardingEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> =>
  pipe(
    RM.of({}),
    RM.apS('locale', RM.of(DefaultLocale)),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.apSW(
      'canonical',
      RM.rightReader(
        match(response.canonical)
          .with(P.string, canonical =>
            R.asks(
              ({ publicUrl }: PublicUrlEnv) => new URL(encodeURI(canonical).replace(/^([^/])/, '/$1'), publicUrl).href,
            ),
          )
          .with(undefined, R.of)
          .exhaustive(),
      ),
    ),
    RM.bindW(
      'body',
      RM.fromReaderK(({ locale, message, userOnboarding }) =>
        templatePage({
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          locale: locale !== DefaultLocale ? locale : undefined,
          title: typeof response.title === 'function' ? response.title(locale) : response.title,
          description: typeof response.description === 'function' ? response.description(locale) : response.description,
          content: html`
            ${response.nav
              ? html` <nav>${typeof response.nav === 'function' ? response.nav(locale) : response.nav}</nav>`
              : ''}

            <main id="${response.skipToLabel}">
              ${message ? showFlashMessage(message, locale) : ''}
              ${typeof response.main === 'function' ? response.main(locale) : response.main}
            </main>
          `,
          skipLinks: [
            [rawHtml(translate(locale, 'skip-links', response.skipToLabel)()), `#${response.skipToLabel}`],
            ...(response._tag === 'PageResponse' && response.extraSkipLink
              ? typeof response.extraSkipLink === 'function'
                ? [response.extraSkipLink(locale)]
                : [response.extraSkipLink]
              : []),
          ],
          current: response.current,
          js: response.js.concat(...(message ? (['notification-banner.js'] as const) : [])),
          type: response._tag === 'StreamlinePageResponse' ? 'streamline' : undefined,
          user,
          userOnboarding,
        }),
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
    RM.ichainFirst(() => RM.fromMiddleware(deleteSlackState)),
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
    RM.ichainMiddlewareK(flow(get('body'), sendHtml)),
  )

const handleTwoUpPageResponse = ({
  response,
  user,
}: {
  response: TwoUpPageResponse
  user?: User
}): RM.ReaderMiddleware<
  GetUserOnboardingEnv & PublicUrlEnv & TemplatePageEnv,
  StatusOpen,
  ResponseEnded,
  never,
  void
> =>
  pipe(
    RM.of({}),
    RM.apS('locale', RM.of(DefaultLocale)),
    RM.apS('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
    RM.apS('userOnboarding', user ? RM.fromReaderTaskEither(maybeGetUserOnboarding(user.orcid)) : RM.of(undefined)),
    RM.apSW(
      'canonical',
      RM.asks(
        ({ publicUrl }: PublicUrlEnv) =>
          new URL(encodeURI(response.canonical).replace(/^([^/])/, '/$1'), publicUrl).href,
      ),
    ),
    RM.bindW(
      'body',
      RM.fromReaderK(({ locale, message, userOnboarding }) =>
        templatePage({
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          locale: locale !== DefaultLocale ? locale : undefined,
          title: typeof response.title === 'function' ? response.title(locale) : response.title,
          description: typeof response.description === 'function' ? response.description(locale) : response.description,
          content: html`
            <h1 class="visually-hidden">${typeof response.h1 === 'function' ? response.h1(locale) : response.h1}</h1>

            <aside id="preprint-details" tabindex="0" aria-label="Preprint details">
              ${typeof response.aside === 'function' ? response.aside(locale) : response.aside}
            </aside>

            <main id="prereviews">
              ${message ? showFlashMessage(message, locale) : ''}
              ${typeof response.main === 'function' ? response.main(locale) : response.main}
            </main>
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
    ),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirst(() =>
      user ? RM.header('Cache-Control', 'no-cache, private') : RM.header('Cache-Control', 'no-cache, public'),
    ),
    RM.ichainFirst(() => RM.header('Vary', 'Cookie')),
    RM.ichainFirst(() => RM.fromMiddleware(deleteFlashMessage)),
    RM.ichainFirst(({ canonical }) => RM.header('Link', `<${canonical}>; rel="canonical"`)),
    RM.ichainMiddlewareK(flow(get('body'), sendHtml)),
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

const handleFlashMessageResponse = ({
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
    RM.asks(({ publicUrl }: PublicUrlEnv) => new URL(response.location, publicUrl).href),
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

const deleteSlackState = pipe(
  M.decodeHeader<HeadersOpen, unknown, string>('Cookie', D.string.decode),
  M.orElse(() => M.right('')),
  M.map(header => RR.has('slack-state', cookie.parse(header))),
  M.chain(hasCookie => (hasCookie ? M.clearCookie('slack-state', { httpOnly: true }) : M.right(undefined))),
)

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
