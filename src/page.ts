import { Array, Boolean, HashMap, String, Tuple, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import rtlDetect from 'rtl-detect'
import { type Html, type PlainText, html, rawHtml } from './html.ts'
import { DefaultLocale, type SupportedLocale, UserSelectableLocales, translate } from './locales/index.ts'
import assets from './manifest.json' with { type: 'json' }
import type * as Router from './Router/index.ts'
import * as Routes from './routes.ts'
import { homeMatch, logInMatch, logOutMatch } from './routes.ts'
import type { UserOnboarding } from './user-onboarding.ts'
import type { User } from './user.ts'

export interface Page {
  readonly locale: SupportedLocale
  readonly title: PlainText
  readonly description?: PlainText
  readonly type?: 'two-up' | 'streamline'
  readonly content: Html
  readonly skipLinks?: ReadonlyArray<[Html, string]>
  readonly current?:
    | 'about-us'
    | 'choose-locale'
    | 'clubs'
    | 'code-of-conduct'
    | 'edia-statement'
    | 'funding'
    | 'home'
    | 'how-to-use'
    | 'live-reviews'
    | 'menu'
    | 'my-details'
    | 'my-prereviews'
    | 'partners'
    | 'people'
    | 'privacy-policy'
    | 'resources'
    | 'review-requests'
    | 'reviews'
    | 'trainings'
  readonly js?: ReadonlyArray<Exclude<Assets<'.js'>, 'expander-button.js' | 'skip-link.js'>>
  readonly user?: User
  readonly userOnboarding?: UserOnboarding
  readonly pageUrls?: Router.PageUrls
}

export interface TemplatePageEnv {
  templatePage: (page: Page) => Html
}

export const templatePage = (page: Page) => R.asks(({ templatePage }: TemplatePageEnv) => templatePage(page))

export const page = ({
  page: { locale, title, description, type, content, skipLinks = [], current, js = [], user, userOnboarding, pageUrls },
  environmentLabel,
  fathomId,
  publicUrl,
  canLogInAsDemoUser = false,
  useCrowdinInContext,
}: {
  page: Page
  environmentLabel?: 'dev' | 'sandbox'
  fathomId?: string
  publicUrl: URL
  canLogInAsDemoUser?: boolean
  useCrowdinInContext: boolean
}): Html => {
  const scripts = pipe(
    Array.dedupe(js),
    Array.appendAll(skipLinks.length > 0 ? ['skip-link.js' as const] : []),
    Array.appendAll(type !== 'streamline' ? ['expander-button.js' as const] : []),
  )

  return html`
    <!doctype html>
    <html lang="${locale}" dir="${rtlDetect.getLangDir(locale)}" prefix="og: https://ogp.me/ns#">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>${title}${current !== 'home' ? ' | PREreview' : ''}</title>

        <link href="${assets['style.css']}" rel="stylesheet" />

        ${useCrowdinInContext
          ? html`
              <script type="text/javascript">
                var _jipt = []
                _jipt.push(['project', 'prereview'])
                _jipt.push([
                  'before_dom_insert',
                  function (text) {
                    return text
                      .replaceAll('<visuallyHidden>', '<span class="visually-hidden">')
                      .replaceAll('</visuallyHidden>', '</span>')
                      .replaceAll('<swoosh>', '<em>')
                      .replaceAll('</swoosh>', '</em>')
                  },
                ])
              </script>
              <script type="text/javascript" src="https://cdn.crowdin.com/jipt/jipt.js"></script>
              <link href="${assets['crowdin.css']}" rel="stylesheet" />
            `
          : ''}
        ${scripts.flatMap(file =>
          Array.map(
            assets[file].preload,
            preload => html` <link href="${preload}" rel="preload" fetchpriority="low" as="script" />`,
          ),
        )}
        ${scripts.map(file => html` <script src="${assets[file].path}" type="module"></script>`)}
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
      <body class="${type === 'two-up' ? type : ''}">
        ${skipLinks.length > 0
          ? html` <skip-link>${skipLinks.map(([text, link]) => html`<a href="${link}">${text}</a>`)}</skip-link>`
          : ''}

        <header>
          ${environmentLabel
            ? html`
                <div class="environment">
                  <strong class="tag">${translate(locale, 'environment', `${environmentLabel}Name`)()}</strong>
                  <span>${translate(locale, 'environment', `${environmentLabel}Text`)()}</span>
                </div>
              `
            : ''}

          <nav>
            <div class="header">
              <div class="logo">
                <a href="${format(homeMatch.formatter, {})}" ${current === 'home' ? html`aria-current="page"` : ''}>
                  <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                </a>
              </div>

              ${type !== 'streamline'
                ? html`
                    <expander-button>
                      <a href="${Routes.Menu}" ${current === 'menu' ? html`aria-current="page"` : ''}
                        >${translate(locale, 'header', 'menu')()}</a
                      >
                      <button aria-controls="navigation" aria-expanded="false" hidden>
                        <span>${translate(locale, 'header', 'menu')()}</span>
                      </button>
                    </expander-button>
                    ${pageUrls
                      ? html`
                          <expander-button>
                            <a
                              href="${Routes.ChooseLocale}"
                              ${current === 'choose-locale' ? html`aria-current="page"` : ''}
                              class="locale"
                              >${new Intl.DisplayNames(locale, {
                                type: 'language',
                                languageDisplay: 'standard',
                                style: 'narrow',
                              }).of(locale.split('-')[0] ?? locale) ?? locale}</a
                            >
                            <button aria-controls="locale" aria-expanded="false" hidden>
                              <span class="locale"
                                >${new Intl.DisplayNames(locale, {
                                  type: 'language',
                                  languageDisplay: 'standard',
                                  style: 'narrow',
                                }).of(locale.split('-')[0] ?? locale) ?? locale}</span
                              >
                            </button>
                          </expander-button>
                        `
                      : ''}
                  `
                : html`
                    ${user
                      ? html` <a href="${format(logOutMatch.formatter, {})}"
                          >${translate(locale, 'header', 'menuLogOut')()}</a
                        >`
                      : ''}
                    ${!user && current === 'home'
                      ? html` <a href="${format(logInMatch.formatter, {})}"
                          >${translate(locale, 'header', 'menuLogIn')()}</a
                        >`
                      : ''}
                  `}
            </div>

            ${type !== 'streamline'
              ? html`
                  <div id="navigation" class="menu" hidden>
                    <div>
                      <h3>${translate(locale, 'header', 'getInvolved')()}</h3>
                      <ul>
                        <li>
                          <a
                            href="${format(Routes.reviewsMatch.formatter, {})}"
                            ${current === 'reviews' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuReviews')()}</a
                          >
                          <p>${translate(locale, 'header', 'menuReviewsHint')()}</p>
                        </li>
                        <li>
                          <a
                            href="${format(Routes.reviewRequestsMatch.formatter, {})}"
                            ${current === 'review-requests' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuRequests')()}</a
                          >
                          <p>${translate(locale, 'header', 'menuRequestsHint')()}</p>
                        </li>
                        <li>
                          <a href="${Routes.Clubs}" ${current === 'clubs' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuClubs')()}</a
                          >
                          <p>${translate(locale, 'header', 'menuClubsHint')()}</p>
                        </li>
                        <li>
                          <a href="${Routes.Trainings}" ${current === 'trainings' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuTrainings')()}</a
                          >
                          <p>${translate(locale, 'header', 'menuTrainingsHint')()}</p>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3>${translate(locale, 'header', 'findOutMore')()}</h3>
                      <ul>
                        <li>
                          <a href="https://content.prereview.org/">${translate(locale, 'header', 'menuBlog')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.AboutUs}" ${current === 'about-us' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuAboutUs')()}</a
                          >
                        </li>
                        <li>
                          <a
                            href="${format(Routes.partnersMatch.formatter, {})}"
                            ${current === 'partners' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuPartners')()}</a
                          >
                        </li>
                        <li>
                          <a href="https://donorbox.org/prereview">${translate(locale, 'header', 'menuDonate')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.LiveReviews}" ${current === 'live-reviews' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuLiveReviews')()}</a
                          >
                        </li>
                        <li>
                          <a href="${Routes.Resources}" ${current === 'resources' ? html`aria-current="page"` : ''}
                            >${translate(locale, 'header', 'menuResources')()}</a
                          >
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3>${translate(locale, 'header', 'myAccount')()}</h3>
                      <ul>
                        ${user
                          ? html`
                              <li>
                                <a
                                  href="${format(Routes.myDetailsMatch.formatter, {})}"
                                  ${current === 'my-details' ? html`aria-current="page"` : ''}
                                  >${translate(
                                    locale,
                                    'header',
                                    'menuMyDetails',
                                  )()}${userOnboarding?.seenMyDetailsPage === false
                                    ? html` <span role="status"
                                        ><span class="visually-hidden"
                                          >${translate(locale, 'header', 'menuNewNotification')()}</span
                                        ></span
                                      >`
                                    : ''}</a
                                >
                              </li>
                              <li>
                                <a
                                  href="${format(Routes.myPrereviewsMatch.formatter, {})}"
                                  ${current === 'my-prereviews' ? html`aria-current="page"` : ''}
                                  >${translate(locale, 'header', 'menuMyPrereviews')()}</a
                                >
                              </li>
                              <li>
                                <a href="${format(Routes.logOutMatch.formatter, {})}"
                                  >${translate(locale, 'header', 'menuLogOut')()}</a
                                >
                              </li>
                            `
                          : html`
                              <li>
                                <a href="${format(Routes.logInMatch.formatter, {})}"
                                  >${translate(locale, 'header', 'menuLogIn')()}</a
                                >
                              </li>
                              ${Boolean.match(canLogInAsDemoUser, {
                                onFalse: () => '',
                                onTrue: () => html`
                                  <li>
                                    <a href="${Routes.LogInDemo}"
                                      >${translate(locale, 'header', 'menuLogInDemoUser')()}</a
                                    >
                                  </li>
                                `,
                              })}
                            `}
                      </ul>
                    </div>
                  </div>

                  ${pageUrls
                    ? html`
                        <div id="locale" class="menu" hidden>
                          <div class="locales">
                            <h3>${translate(locale, 'header', 'chooseLanguage')()}</h3>
                            <ul>
                              ${pipe(
                                Array.fromIterable(UserSelectableLocales),
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
                                      <a
                                        href="${HashMap.unsafeGet(pageUrls.localeUrls, code).href}"
                                        lang="${code}"
                                        hreflang="${code}"
                                        ${locale === code ? html`aria-current="true"` : ''}
                                        >${name}</a
                                      >
                                    </li>
                                  `,
                                ),
                              )}
                            </ul>
                          </div>
                        </div>
                      `
                    : ''}
                `
              : ''}
          </nav>
        </header>

        <div class="contents">${content}</div>

        <footer>
          ${type !== 'streamline'
            ? html`
                <div>
                  <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                </div>

                ${pageUrls
                  ? html`
                      <div>
                        <span>${translate(locale, 'footer', 'chooseLanguage')()}</span>

                        <ul>
                          ${pipe(
                            Array.fromIterable(UserSelectableLocales),
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
                              (a, b) => String.localeCompare(b, [locale, DefaultLocale], { sensitivity: 'base' })(a),
                            ),
                            Array.map(
                              ([code, name]) => html`
                                <li>
                                  <a
                                    href="${HashMap.unsafeGet(pageUrls.localeUrls, code).href}"
                                    lang="${code}"
                                    hreflang="${code}"
                                    ${locale === code ? html`aria-current="true"` : ''}
                                    >${name}</a
                                  >
                                </li>
                              `,
                            ),
                          )}
                        </ul>
                      </div>
                    `
                  : ''}

                <div>
                  ${translate(locale, 'footer', 'newsletterText')()}
                  <a href="https://prereview.civicrm.org/civicrm/mailing/url?u=17&qid=30" class="forward"
                    ><span>${translate(locale, 'footer', 'newsletterLink')()}</span></a
                  >
                </div>

                <div>
                  ${translate(locale, 'footer', 'slackText')()}
                  <a href="https://bit.ly/PREreview-Slack" class="forward"
                    ><span>${translate(locale, 'footer', 'slackLink')()}</span></a
                  >
                </div>

                <ul aria-label="${translate(locale, 'footer', 'menuHeading')()}">
                  <li><a href="https://donorbox.org/prereview">${translate(locale, 'footer', 'menuDonate')()}</a></li>
                  <li>
                    <a href="${Routes.People}" ${current === 'people' ? html`aria-current="page"` : ''}
                      >${translate(locale, 'footer', 'menuPeople')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.Funding}" ${current === 'funding' ? html`aria-current="page"` : ''}
                      >${translate(locale, 'footer', 'menuFunding')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.CodeOfConduct}" ${current === 'code-of-conduct' ? html`aria-current="page"` : ''}
                      >${translate(locale, 'footer', 'menuCodeOfConduct')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.EdiaStatement}" ${current === 'edia-statement' ? html`aria-current="page"` : ''}
                      >${translate(locale, 'footer', 'menuEdiaStatement')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.PrivacyPolicy}" ${current === 'privacy-policy' ? html`aria-current="page"` : ''}
                      >${translate(locale, 'footer', 'menuPrivacyPolicy')()}</a
                    >
                  </li>
                  <li><a href="https://content.prereview.org/">${translate(locale, 'footer', 'menuBlog')()}</a></li>
                  <li>
                    <a href="${Routes.HowToUse}" ${current === 'how-to-use' ? html`aria-current="page"` : ''}
                      >${translate(locale, 'footer', 'menuHowToUse')()}</a
                    >
                  </li>
                </ul>

                <ul class="contacts" aria-label="${translate(locale, 'footer', 'contactHeading')()}">
                  <li>
                    <a
                      href="mailto:contact@prereview.org"
                      class="email"
                      aria-label="${translate(locale, 'footer', 'contactEmail')({ address: 'contact@prereview.org' })}"
                      ><span translate="no">contact@prereview.org</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://bsky.app/profile/prereview.bsky.social"
                      class="bluesky"
                      aria-label="${translate(
                        locale,
                        'footer',
                        'contactBluesky',
                      )({ handle: '@prereview.bsky.social' })}"
                      ><span translate="no">@prereview.bsky.social</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://mas.to/@prereview"
                      class="mastodon"
                      aria-label="${translate(locale, 'footer', 'contactMastodon')({ handle: '@prereview@mas.to' })}"
                      ><span translate="no">@prereview@mas.to</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://www.linkedin.com/company/prereview/"
                      class="linked-in"
                      aria-label="${translate(locale, 'footer', 'contactLinkedIn')({ handle: 'PREreview' })}"
                      ><span translate="no">PREreview</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://github.com/PREreview"
                      class="github"
                      aria-label="${translate(locale, 'footer', 'contactGitHub')({ handle: 'PREreview' })}"
                      ><span translate="no">PREreview</span></a
                    >
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
                        html`<a href="https://zenodo.org/communities/prereview-reviews/records">${text}</a>`.toString(),
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
  `
}

type Assets<A extends string> = EndsWith<keyof typeof assets, A>

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
