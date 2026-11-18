import { Match } from 'effect'
import { html } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type { SpotlightBanner } from '../../SpotlightBanners/index.ts'
import type { UserOnboarding } from '../../user-onboarding.ts'
import { showNotificationBanner } from '../notification-banner.ts'
import type { Page } from '../page.ts'
import { showSpotlightBanner } from '../SpotlightBanner.ts'
import type { PageUrls } from './ConstructPageUrls.ts'
import type { FlashMessageSchema } from './FlashMessage.ts'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from './Response.ts'

export const toPage = ({
  locale,
  message,
  userOnboarding,
  pageUrls,
  response,
  isLoggedIn,
  spotlightBanner,
}: {
  locale: SupportedLocale
  message?: (typeof FlashMessageSchema.literals)[number]
  userOnboarding?: UserOnboarding
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse
  pageUrls?: PageUrls
  isLoggedIn: boolean
  spotlightBanner?: SpotlightBanner
}): Page =>
  response._tag === 'TwoUpPageResponse'
    ? {
        locale,
        title: response.title,
        description: response.description,
        image: response.image,
        content: html`
          <aside
            id="${response.type}-details"
            tabindex="0"
            aria-label="${
              response.type === 'dataset'
                ? translate(locale, `${response.type}-reviews-page`, `${response.type}Details`)()
                : translate(locale, `${response.type}-reviews`, `${response.type}Details`)()
            }"
          >
            ${response.aside}
          </aside>

          <main id="prereviews">
            <h1 class="visually-hidden">${response.h1}</h1>

            ${spotlightBanner ? showSpotlightBanner(spotlightBanner) : ''}
            ${message ? showFlashMessage(message, locale) : ''} ${response.main}
          </main>
        `,
        skipLinks: [
          [translate(locale, 'skip-links', `${response.type}Details`)(), `#${response.type}-details`],
          [translate(locale, 'skip-links', 'prereviews')(), '#prereviews'],
        ],
        js: [
          ...(message ? (['notification-banner.js'] as const) : []),
          ...(spotlightBanner ? (['spotlight-banner.js'] as const) : []),
        ],
        pageUrls,
        type: 'two-up',
        isLoggedIn,
        userOnboarding,
      }
    : {
        locale,
        title: response.title,
        description: response.description,
        image: response.image,
        content: html`
          ${response.nav ? html` <nav>${response.nav}</nav>` : ''}

          <main id="${response.skipToLabel}">
            ${spotlightBanner ? showSpotlightBanner(spotlightBanner) : ''}${message ? showFlashMessage(message, locale) : ''}${response.main}
          </main>
        `,
        skipLinks: [
          [translate(locale, 'skip-links', response.skipToLabel)(), `#${response.skipToLabel}`],
          ...(response._tag === 'PageResponse' && response.extraSkipLink ? [response.extraSkipLink] : []),
        ],
        current: response.current,
        js: response.js.concat(
          ...(message ? (['notification-banner.js'] as const) : []),
          ...(spotlightBanner ? (['spotlight-banner.js'] as const) : []),
        ),
        pageUrls,
        type: response._tag === 'StreamlinePageResponse' ? 'streamline' : undefined,
        isLoggedIn,
        userOnboarding,
      }

function showFlashMessage(message: (typeof FlashMessageSchema.literals)[number], locale: SupportedLocale) {
  return Match.value(message).pipe(
    Match.literalsExhaustive({
      'logged-out': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageLoggedOut')()}</p>`,
        }),
      'logged-in': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageLoggedIn')()}</p>`,
        }),
      'logged-in-demo': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageLoggedInDemoUser')()}</p>`,
        }),
      blocked: () =>
        showNotificationBanner({
          type: 'failure',
          title: translate(locale, 'flash-messages', 'titleAccessDenied')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageLogInBlocked')()}</p>`,
        }),
      'verify-contact-email': () =>
        showNotificationBanner({
          type: 'notice',
          title: translate(locale, 'flash-messages', 'titleImportant')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageVerifyEmail')()}</p>`,
        }),
      'verify-contact-email-resend': () =>
        showNotificationBanner({
          type: 'notice',
          title: translate(locale, 'flash-messages', 'titleImportant')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageVerifyEmailResend')()}</p>`,
        }),
      'contact-email-verified': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageEmailVerified')()}</p>`,
        }),
      'orcid-connected': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageOrcidConnected')()}</p>`,
        }),
      'orcid-disconnected': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageOrcidDisconnected')()}</p>`,
        }),
      'slack-connected': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageSlackConnected')()}</p>`,
        }),
      'slack-disconnected': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageSlackDisconnected')()}</p>`,
        }),
      'avatar-changed': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageAvatarChanged')()}</p>`,
        }),
      'avatar-removed': () =>
        showNotificationBanner({
          type: 'success',
          title: translate(locale, 'flash-messages', 'titleSuccess')(),
          content: html`<p>${translate(locale, 'flash-messages', 'messageAvatarRemoved')()}</p>`,
        }),
    }),
  )
}
