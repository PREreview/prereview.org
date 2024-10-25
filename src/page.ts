import { Array, String, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import type { Eq } from 'fp-ts/lib/Eq.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import * as s from 'fp-ts/lib/string.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import type { CanChooseLocaleEnv } from './feature-flags.js'
import { type Html, type PlainText, html, rawHtml } from './html.js'
import { DefaultLocale, type SupportedLocale, SupportedLocales, translate } from './locales/index.js'
import assets from './manifest.json' assert { type: 'json' }
import type { PublicUrlEnv } from './public-url.js'
import {
  aboutUsMatch,
  clubsMatch,
  codeOfConductMatch,
  ediaStatementMatch,
  fundingMatch,
  homeMatch,
  howToUseMatch,
  liveReviewsMatch,
  logInMatch,
  logOutMatch,
  myDetailsMatch,
  myPrereviewsMatch,
  partnersMatch,
  peopleMatch,
  privacyPolicyMatch,
  resourcesMatch,
  reviewRequestsMatch,
  reviewsMatch,
  trainingsMatch,
} from './routes.js'
import type { UserOnboarding } from './user-onboarding.js'
import type { User } from './user.js'

export interface FathomEnv {
  readonly fathomId?: string
}

export interface EnvironmentLabelEnv {
  readonly environmentLabel?: 'dev' | 'sandbox'
}

export interface Page {
  readonly locale?: SupportedLocale
  readonly title: PlainText
  readonly description?: PlainText
  readonly type?: 'two-up' | 'streamline'
  readonly content: Html
  readonly skipLinks?: ReadonlyArray<[Html, string]>
  readonly current?:
    | 'about-us'
    | 'clubs'
    | 'code-of-conduct'
    | 'edia-statement'
    | 'funding'
    | 'home'
    | 'how-to-use'
    | 'live-reviews'
    | 'my-details'
    | 'my-prereviews'
    | 'partners'
    | 'people'
    | 'privacy-policy'
    | 'resources'
    | 'review-requests'
    | 'reviews'
    | 'trainings'
  readonly js?: ReadonlyArray<Exclude<Assets<'.js'>, 'collapsible-menu.js' | 'skip-link.js'>>
  readonly user?: User
  readonly userOnboarding?: UserOnboarding
}

export interface TemplatePageEnv {
  templatePage: (page: Page) => Html
}

export const templatePage = (page: Page) => R.asks(({ templatePage }: TemplatePageEnv) => templatePage(page))

export function page({
  locale = DefaultLocale,
  title,
  description,
  type,
  content,
  skipLinks = [],
  current,
  js = [],
  user,
  userOnboarding,
}: Page): R.Reader<EnvironmentLabelEnv & FathomEnv & PublicUrlEnv & Partial<CanChooseLocaleEnv>, Html> {
  const scripts = pipe(
    js,
    RA.uniq(stringEq()),
    RA.concatW(skipLinks.length > 0 ? ['skip-link.js' as const] : []),
    RA.concatW(type !== 'streamline' ? ['collapsible-menu.js' as const] : []),
  )

  return R.asks(
    ({ canChooseLocale, fathomId, environmentLabel, publicUrl }) => html`
      <!doctype html>
      <html lang="${locale}" dir="${rtlDetect.getLangDir(locale)}" prefix="og: https://ogp.me/ns#">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <title>${title}${current !== 'home' ? ' | PREreview' : ''}</title>

          <link href="${assets['style.css']}" rel="stylesheet" />

          ${scripts.flatMap(
            flow(
              file => assets[file].preload as ReadonlyArray<string>,
              RA.map(preload => html` <link href="${preload}" rel="preload" fetchpriority="low" as="script" />`),
            ),
          )}
          ${scripts.map(file => html` <script src="${assets[file].path}" type="module"></script>`)}
          ${canChooseLocale === true
            ? html`<script src="${assets['locale-picker.js'].path}" type="module"></script>`
            : ''}
          ${typeof fathomId === 'string'
            ? html` <script src="https://cdn.usefathom.com/script.js" data-site="${fathomId}" defer></script>`
            : ''}

          <meta property="og:title" content="${title}" />
          ${description ? html` <meta property="og:description" content="${description}" />` : ''}
          ${current === 'home'
            ? html`
                <meta property="og:image" content="${new URL(assets['prereview-og.png'], publicUrl).href}" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
              `
            : ''}
          <link rel="icon" href="${assets['favicon.ico']}" sizes="32x32" />
          <link rel="icon" href="${assets['favicon.svg']}" type="image/svg+xml" />
        </head>
        <body ${rawHtml(type === 'two-up' ? `class="${type}"` : '')}>
          ${skipLinks.length > 0
            ? html` <skip-link>${skipLinks.map(([text, link]) => html`<a href="${link}">${text}</a>`)}</skip-link>`
            : ''}

          <header>
            <div class="navigation">
              ${environmentLabel
                ? html`
                    <div class="phase-banner">
                      <strong class="tag">${translate(locale, 'environment', `${environmentLabel}Name`)()}</strong>
                      <span>${translate(locale, 'environment', `${environmentLabel}Text`)()}</span>
                    </div>
                  `
                : ''}
              ${user || type !== 'streamline'
                ? html`
                    <nav>
                      <ul>
                        ${type !== 'streamline'
                          ? html`
                              <li>
                                <a href="https://content.prereview.org/"
                                  >${translate(locale, 'header', 'menuBlog')()}</a
                                >
                              </li>
                              <li>
                                <a
                                  href="${format(aboutUsMatch.formatter, {})}"
                                  ${current === 'about-us' ? html`aria-current="page"` : ''}
                                  >${translate(locale, 'header', 'menuAboutUs')()}</a
                                >
                              </li>
                              <li>
                                <a
                                  href="${format(partnersMatch.formatter, {})}"
                                  ${current === 'partners' ? html`aria-current="page"` : ''}
                                  >${translate(locale, 'header', 'menuPartners')()}</a
                                >
                              </li>
                              <li>
                                <a href="https://donorbox.org/prereview"
                                  >${translate(locale, 'header', 'menuDonate')()}</a
                                >
                              </li>
                            `
                          : ''}
                        ${user && type !== 'streamline'
                          ? html` <li>
                                <a
                                  href="${format(myDetailsMatch.formatter, {})}"
                                  ${current === 'my-details' ? html`aria-current="page"` : ''}
                                  >${translate(locale, 'header', 'menuMyDetails')()}${match(userOnboarding)
                                    .with(
                                      { seenMyDetailsPage: false },
                                      () =>
                                        html` <span role="status"
                                          ><span class="visually-hidden"
                                            >${translate(locale, 'header', 'menuNewNotification')()}</span
                                          ></span
                                        >`,
                                    )
                                    .otherwise(() => '')}</a
                                >
                              </li>
                              <li>
                                <a
                                  href="${format(myPrereviewsMatch.formatter, {})}"
                                  ${current === 'my-prereviews' ? html`aria-current="page"` : ''}
                                  >${translate(locale, 'header', 'menuMyPrereviews')()}</a
                                >
                              </li>`
                          : ''}
                        ${user
                          ? html` <li>
                              <a href="${format(logOutMatch.formatter, {})}"
                                >${translate(locale, 'header', 'menuLogOut')()}</a
                              >
                            </li>`
                          : ''}
                        ${!user && current === 'home'
                          ? html` <li>
                              <a href="${format(logInMatch.formatter, {})}"
                                >${translate(locale, 'header', 'menuLogIn')()}</a
                              >
                            </li>`
                          : ''}
                      </ul>
                    </nav>
                  `
                : ''}
            </div>

            <div class="header">
              <div class="logo">
                <a href="${format(homeMatch.formatter, {})}" ${current === 'home' ? html`aria-current="page"` : ''}>
                  <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                </a>
              </div>

              ${type !== 'streamline'
                ? html`
                    <collapsible-menu>
                      <nav>
                        <ul>
                          <li>
                            <a
                              href="${format(reviewsMatch.formatter, {})}"
                              ${current === 'reviews' ? html`aria-current="page"` : ''}
                              >${translate(locale, 'header', 'menuReviews')()}</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(reviewRequestsMatch.formatter, {})}"
                              ${current === 'review-requests' ? html`aria-current="page"` : ''}
                              >${translate(locale, 'header', 'menuRequests')()}</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(trainingsMatch.formatter, {})}"
                              ${current === 'trainings' ? html`aria-current="page"` : ''}
                              >${translate(locale, 'header', 'menuTrainings')()}</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(liveReviewsMatch.formatter, {})}"
                              ${current === 'live-reviews' ? html`aria-current="page"` : ''}
                              >${translate(locale, 'header', 'menuLiveReviews')()}</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(resourcesMatch.formatter, {})}"
                              ${current === 'resources' ? html`aria-current="page"` : ''}
                              >${translate(locale, 'header', 'menuResources')()}</a
                            >
                          </li>
                          <li>
                            <a
                              href="${format(clubsMatch.formatter, {})}"
                              ${current === 'clubs' ? html`aria-current="page"` : ''}
                              >${translate(locale, 'header', 'menuClubs')()}</a
                            >
                          </li>
                        </ul>
                      </nav>
                    </collapsible-menu>
                  `
                : ''}
            </div>
          </header>

          ${current === 'home'
            ? html`
                <div class="global-bar">
                  <span>
                    Help shape the future of our community! Share your insights by taking our quick
                    <a href="https://bit.ly/PREreview-Survey-2024">Community&nbsp;Survey</a>.
                  </span>
                </div>
              `
            : ''}

          <div class="contents">${content}</div>

          <footer>
            ${type !== 'streamline'
              ? html`
                  <div>
                    <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                  </div>

                  ${canChooseLocale === true
                    ? html`
                        <div>
                          <p>Choose your language:</p>

                          <locale-picker>
                            <ul>
                              ${pipe(
                                Array.fromIterable(SupportedLocales),
                                Array.map(supportedLocale =>
                                  Tuple.make(
                                    supportedLocale,
                                    new Intl.DisplayNames(supportedLocale, {
                                      type: 'language',
                                      languageDisplay: 'standard',
                                      style: 'short',
                                    }).of(supportedLocale) ?? supportedLocale,
                                  ),
                                ),
                                Array.sortWith(
                                  ([, b]) => b,
                                  (a, b) =>
                                    String.localeCompare(b, [locale, DefaultLocale], { sensitivity: 'base' })(a),
                                ),
                                Array.map(
                                  ([code, name]) => html`
                                    <li>
                                      <a href="#" lang="${code}" hreflang="${code}" data-locale="${code}">${name}</a>
                                    </li>
                                  `,
                                ),
                              )}
                            </ul>
                          </locale-picker>
                        </div>
                      `
                    : ''}

                  <div>
                    ${translate(locale, 'footer', 'newsletterText')()}
                    <a href="https://prereview.civicrm.org/civicrm/mailing/url?u=17&qid=30" class="forward"
                      >${translate(locale, 'footer', 'newsletterLink')()}</a
                    >
                  </div>

                  <div>
                    ${translate(locale, 'footer', 'slackText')()}
                    <a href="https://bit.ly/PREreview-Slack" class="forward"
                      >${translate(locale, 'footer', 'slackLink')()}</a
                    >
                  </div>

                  <ul aria-label="Support links">
                    <li><a href="https://donorbox.org/prereview">${translate(locale, 'footer', 'menuDonate')()}</a></li>
                    <li>
                      <a
                        href="${format(peopleMatch.formatter, {})}"
                        ${current === 'people' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'footer', 'menuPeople')()}</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(fundingMatch.formatter, {})}"
                        ${current === 'funding' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'footer', 'menuFunding')()}</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(codeOfConductMatch.formatter, {})}"
                        ${current === 'code-of-conduct' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'footer', 'menuCodeOfConduct')()}</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(ediaStatementMatch.formatter, {})}"
                        ${current === 'edia-statement' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'footer', 'menuEdiaStatement')()}</a
                      >
                    </li>
                    <li>
                      <a
                        href="${format(privacyPolicyMatch.formatter, {})}"
                        ${current === 'privacy-policy' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'footer', 'menuPrivacyPolicy')()}</a
                      >
                    </li>
                    <li><a href="https://content.prereview.org/">${translate(locale, 'footer', 'menuBlog')()}</a></li>
                    <li>
                      <a
                        href="${format(howToUseMatch.formatter, {})}"
                        ${current === 'how-to-use' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'footer', 'menuHowToUse')()}</a
                      >
                    </li>
                  </ul>

                  <ul class="contacts" aria-label="Contact us">
                    <li>
                      <span class="visually-hidden">
                        ${rawHtml(
                          translate(
                            locale,
                            'footer',
                            'contactEmail',
                          )({
                            address: html`</span><a href="mailto:contact@prereview.org" class="email" translate="no"
                            >contact@prereview.org</a
                            ><span class="visually-hidden">`.toString(),
                          }),
                        )}
                      </span>
                    </li>
                    <li>
                      <span class="visually-hidden">
                        ${rawHtml(
                          translate(
                            locale,
                            'footer',
                            'contactTwitter',
                          )({
                            handle: html`</span><a href="https://twitter.com/PREreview_" class="twitter" translate="no"
                            >@PREreview_</a
                            ><span class="visually-hidden">`.toString(),
                          }),
                        )}
                      </span>
                    </li>
                    <li>
                      <span class="visually-hidden">
                        ${rawHtml(
                          translate(
                            locale,
                            'footer',
                            'contactMastodon',
                          )({
                            handle: html`</span><a href="https://mas.to/@prereview" class="mastodon" translate="no"
                            >@prereview@mas.to</a
                            ><span class="visually-hidden">`.toString(),
                          }),
                        )}
                      </span>
                    </li>
                    <li>
                      <span class="visually-hidden">
                        ${rawHtml(
                          translate(
                            locale,
                            'footer',
                            'contactLinkedIn',
                          )({
                            handle: html`</span><a
                              href="https://www.linkedin.com/company/prereview/"
                              class="linked-in"
                              translate="no"
                            >PREreview</a
                            ><span class="visually-hidden">`.toString(),
                          }),
                        )}</span
                      >
                    </li>
                    <li>
                      <span class="visually-hidden">
                        ${rawHtml(
                          translate(
                            locale,
                            'footer',
                            'contactGitHub',
                          )({
                            handle: html`</span><a href="https://github.com/PREreview" class="github" translate="no"
                            >PREreview</a
                            ><span class="visually-hidden">`.toString(),
                          }),
                        )}
                      </span>
                    </li>
                  </ul>

                  <div class="small">
                    ${rawHtml(
                      translate(
                        locale,
                        'footer',
                        'zenodo',
                      )({
                        community: text =>
                          html`<a href="https://zenodo.org/communities/prereview-reviews/records"
                            >${text}</a
                          >`.toString(),
                        api: text => html`<a href="https://developers.zenodo.org/">${text}</a>`.toString(),
                      }),
                    )}
                  </div>
                `
              : ''}

            <small>
              ${rawHtml(
                translate(
                  locale,
                  'footer',
                  'copyright',
                )({
                  link: text =>
                    html`<a href="https://creativecommons.org/licenses/by/4.0/" rel="license">${text}</a>`.toString(),
                }),
              )}
            </small>
          </footer>
        </body>
      </html>
    `,
  )
}

function stringEq<A>(): Eq<A> {
  return s.Eq as Eq<A>
}

type Assets<A extends string> = EndsWith<keyof typeof assets, A>

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
