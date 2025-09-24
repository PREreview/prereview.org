import { Array, Schema, Struct, flow, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import { type HeadersOpen, MediaType, type ResponseEnded, type StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { deleteFlashMessage, getFlashMessage } from './flash-message.ts'
import { type Html, html, rawHtml } from './html.ts'
import { type SupportedLocale, translate } from './locales/index.ts'
import { showNotificationBanner } from './notification-banner.ts'
import { type Page, type TemplatePageEnv, templatePage } from './page.ts'
import type { PublicUrlEnv } from './public-url.ts'
import type * as Router from './Router/index.ts'
import * as StatusCodes from './StatusCodes.ts'
import { type GetUserOnboardingEnv, type UserOnboarding, maybeGetUserOnboarding } from './user-onboarding.ts'
import type { User } from './user.ts'

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
  readonly status: StatusCodes.StatusCode
  readonly title: Page['title']
  readonly description?: Page['description']
  readonly nav?: Html
  readonly main: Html
  readonly skipToLabel: 'form' | 'main' | 'prereview'
  readonly extraSkipLink?: [Html, string]
  readonly js: Required<Page>['js']
  readonly allowRobots?: false
}

export interface StreamlinePageResponse {
  readonly _tag: 'StreamlinePageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: StatusCodes.StatusCode
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
  readonly type: 'preprint' | 'dataset'
}

export interface RedirectResponse {
  readonly _tag: 'RedirectResponse'
  readonly status: typeof StatusCodes.SeeOther | typeof StatusCodes.Found | typeof StatusCodes.MovedPermanently
  readonly location: URL | string
}

export interface FlashMessageResponse {
  readonly _tag: 'FlashMessageResponse'
  readonly location: string
  readonly message: typeof FlashMessageSchema.Type
}

export interface ForceLogInResponse {
  readonly _tag: 'ForceLogInResponse'
  readonly user: User
}

export interface LogInResponse {
  readonly _tag: 'LogInResponse'
  readonly location: string
}

export const PageResponse = (
  args: Optional<Omit<PageResponse, '_tag'>, 'status' | 'js' | 'skipToLabel'>,
): PageResponse => ({
  _tag: 'PageResponse',
  status: StatusCodes.OK,
  js: Array.empty(),
  skipToLabel: 'main',
  ...args,
})

export const StreamlinePageResponse = (
  args: Optional<Omit<StreamlinePageResponse, '_tag'>, 'status' | 'js' | 'skipToLabel'>,
): StreamlinePageResponse => ({
  _tag: 'StreamlinePageResponse',
  status: StatusCodes.OK,
  js: Array.empty(),
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
  status: StatusCodes.SeeOther,
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

export const ForceLogInResponse = (args: Omit<ForceLogInResponse, '_tag'>): ForceLogInResponse => ({
  _tag: 'ForceLogInResponse',
  ...args,
})

export function handleResponse({
  response,
  user,
  locale,
}: {
  response: PageResponse | RedirectResponse
  user?: User
  locale: SupportedLocale
}): RM.ReaderMiddleware<GetUserOnboardingEnv & PublicUrlEnv & TemplatePageEnv, StatusOpen, ResponseEnded, never, void> {
  return match({ response, user, locale })
    .with({ response: { _tag: 'PageResponse' } }, handlePageResponse)
    .with({ response: { _tag: 'RedirectResponse' } }, RM.fromMiddlewareK(handleRedirectResponse))
    .exhaustive()
}

export const FlashMessageSchema = Schema.Literal(
  'logged-out',
  'logged-in',
  'logged-in-demo',
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

          <aside
            id="${response.type}-details"
            tabindex="0"
            aria-label="${response.type === 'dataset'
              ? 'Dataset details'
              : translate(locale, `${response.type}-reviews`, `${response.type}Details`)()}"
          >
            ${response.aside}
          </aside>

          <main id="prereviews">${message ? showFlashMessage(message, locale) : ''} ${response.main}</main>
        `,
        skipLinks: [
          [
            response.type === 'dataset'
              ? html`Skip to dataset details`
              : rawHtml(translate(locale, 'skip-links', `${response.type}Details`)()),
            `#${response.type}-details`,
          ],
          [rawHtml(translate(locale, 'skip-links', 'prereviews')()), '#prereviews'],
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
  response: PageResponse
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
      !StatusCodes.isCacheable(response.status)
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
        match(response.allowRobots)
          .with(false, () => M.header('X-Robots-Tag', 'none, noarchive'))
          .with(undefined, M.of<HeadersOpen>)
          .exhaustive(),
      ),
    ),
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
      !StatusCodes.isCacheable(response.status)
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
    .with('logged-in-demo', () =>
      showNotificationBanner({
        type: 'success',
        title: rawHtml(translate(locale, 'flash-messages', 'titleSuccess')()),
        content: html`<p>${rawHtml(translate(locale, 'flash-messages', 'messageLoggedInDemoUser')())}</p>`,
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

function sendHtml(html: Html): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html.toString())),
  )
}

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
