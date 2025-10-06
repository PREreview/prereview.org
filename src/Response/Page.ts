import { match } from 'ts-pattern'
import { html, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { showNotificationBanner } from '../notification-banner.ts'
import type { Page } from '../page.ts'
import type * as Router from '../Router/index.ts'
import type { UserOnboarding } from '../user-onboarding.ts'
import type { User } from '../user.ts'
import type { FlashMessageSchema } from './FlashMessage.ts'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from './Response.ts'

export const toPage = ({
  locale,
  message,
  userOnboarding,
  pageUrls,
  response,
  user,
}: {
  locale: SupportedLocale
  message?: (typeof FlashMessageSchema.literals)[number]
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

function showFlashMessage(message: (typeof FlashMessageSchema.literals)[number], locale: SupportedLocale) {
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
