import { Array, Boolean, HashMap, String, Tuple, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { type Html, type PlainText, html, rawHtml } from '../html.ts'
import { DefaultLocale, type SupportedLocale, UserSelectableLocales, translate } from '../locales/index.ts'
import assets from '../manifest.json' with { type: 'json' }
import * as Routes from '../routes.ts'
import type { UserOnboarding } from '../user-onboarding.ts'
import type { User } from '../user.ts'
import type * as Response from './Response/index.ts'

export interface Page {
  readonly locale: SupportedLocale
  readonly title: PlainText
  readonly description?: PlainText
  readonly type?: 'two-up' | 'streamline'
  readonly content: Html
  readonly skipLinks?: ReadonlyArray<[Html, string]>
  readonly current?:
    | 'about-us'
    | 'champions-program'
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
    | 'my-review-requests'
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
  readonly pageUrls?: Response.PageUrls
}

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
  const t = translate(locale)

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
                  <strong class="tag">${t('environment', `${environmentLabel}Name`)()}</strong>
                  <span>${t('environment', `${environmentLabel}Text`)()}</span>
                </div>
              `
            : ''}

          <nav>
            <div class="header">
              <div class="logo">
                <a href="${Routes.HomePage}" ${current === 'home' ? html`aria-current="page"` : ''}>
                  <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                </a>
              </div>

              ${type !== 'streamline'
                ? html`
                    <expander-button>
                      <a href="${Routes.Menu}" ${current === 'menu' ? html`aria-current="page"` : ''}
                        >${t('header', 'menu')()}</a
                      >
                      <button aria-controls="navigation" aria-expanded="false" hidden>
                        <span>${t('header', 'menu')()}</span>
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
                    ${user ? html`<a href="${Routes.LogOut}">${t('header', 'menuLogOut')()}</a>` : ''}
                    ${!user && current === 'home'
                      ? html` <a href="${Routes.LogIn}">${t('header', 'menuLogIn')()}</a>`
                      : ''}
                  `}
            </div>

            ${type !== 'streamline'
              ? html`
                  <div id="navigation" class="menu" hidden>
                    <div>
                      <h3>${t('header', 'getInvolved')()}</h3>
                      <ul>
                        <li>
                          <a
                            href="${format(Routes.reviewsMatch.formatter, {})}"
                            ${current === 'reviews' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuReviews')()}</a
                          >
                          <p>${t('header', 'menuReviewsHint')()}</p>
                        </li>
                        <li>
                          <a
                            href="${Routes.ReviewRequests}"
                            ${current === 'review-requests' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuRequests')()}</a
                          >
                          <p>${t('header', 'menuRequestsHint')()}</p>
                        </li>
                        <li>
                          <a href="${Routes.Clubs}" ${current === 'clubs' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuClubs')()}</a
                          >
                          <p>${t('header', 'menuClubsHint')()}</p>
                        </li>
                        <li>
                          <a href="${Routes.Trainings}" ${current === 'trainings' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuTrainings')()}</a
                          >
                          <p>${t('header', 'menuTrainingsHint')()}</p>
                        </li>
                        <li>
                          <a
                            href="${Routes.ChampionsProgram}"
                            ${current === 'champions-program' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuChampions')()}</a
                          >
                          <p>${t('header', 'menuChampionsHint')()}</p>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3>${t('header', 'findOutMore')()}</h3>
                      <ul>
                        <li>
                          <a href="https://content.prereview.org/">${t('header', 'menuBlog')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.AboutUs}" ${current === 'about-us' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuAboutUs')()}</a
                          >
                        </li>
                        <li>
                          <a href="${Routes.Partners}" ${current === 'partners' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuPartners')()}</a
                          >
                        </li>
                        <li>
                          <a href="https://donorbox.org/prereview">${t('header', 'menuDonate')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.LiveReviews}" ${current === 'live-reviews' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuLiveReviews')()}</a
                          >
                        </li>
                        <li>
                          <a href="${Routes.Resources}" ${current === 'resources' ? html`aria-current="page"` : ''}
                            >${t('header', 'menuResources')()}</a
                          >
                        </li>
                        <li>
                          <a href="https://stats.prereview.org/">${t('header', 'menuStatistics')()}</a>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3>${t('header', 'myAccount')()}</h3>
                      <ul>
                        ${user
                          ? html`
                              <li>
                                <a
                                  href="${format(Routes.myDetailsMatch.formatter, {})}"
                                  ${current === 'my-details' ? html`aria-current="page"` : ''}
                                  >${t('header', 'menuMyDetails')()}${userOnboarding?.seenMyDetailsPage === false
                                    ? html` <span role="status"
                                        ><span class="visually-hidden"
                                          >${t('header', 'menuNewNotification')()}</span
                                        ></span
                                      >`
                                    : ''}</a
                                >
                              </li>
                              <li>
                                <a
                                  href="${format(Routes.myPrereviewsMatch.formatter, {})}"
                                  ${current === 'my-prereviews' ? html`aria-current="page"` : ''}
                                  >${t('header', 'menuMyPrereviews')()}</a
                                >
                              </li>
                              <li>
                                <a
                                  href="${Routes.MyReviewRequests}"
                                  ${current === 'my-review-requests' ? html`aria-current="page"` : ''}
                                  >${t('header', 'menuMyReviewRequests')()}</a
                                >
                              </li>
                              <li>
                                <a href="${Routes.LogOut}">${t('header', 'menuLogOut')()}</a>
                              </li>
                            `
                          : html`
                              <li>
                                <a href="${Routes.LogIn}">${t('header', 'menuLogIn')()}</a>
                              </li>
                              ${Boolean.match(canLogInAsDemoUser, {
                                onFalse: () => '',
                                onTrue: () => html`
                                  <li>
                                    <a href="${Routes.LogInDemo}">${t('header', 'menuLogInDemoUser')()}</a>
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
                            <h3>${t('header', 'chooseLanguage')()}</h3>
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
                        <span>${t('footer', 'chooseLanguage')()}</span>

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
                  ${t('footer', 'newsletterText')()}
                  <a href="https://prereview.civicrm.org/civicrm/mailing/url?u=17&qid=30" class="forward"
                    ><span>${t('footer', 'newsletterLink')()}</span></a
                  >
                </div>

                <div>
                  ${t('footer', 'slackText')()}
                  <a href="https://bit.ly/PREreview-Slack" class="forward"
                    ><span>${t('footer', 'slackLink')()}</span></a
                  >
                </div>

                <div>
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSfynZ25_toGP6pnTrEyKE-Fv-7z7pK2h9AlNksKI9_DVJMnng/viewform"
                    >${t('footer', 'feedbackLink')()}</a
                  >
                </div>

                <ul aria-label="${t('footer', 'menuHeading')()}">
                  <li><a href="https://donorbox.org/prereview">${t('footer', 'menuDonate')()}</a></li>
                  <li>
                    <a href="${Routes.People}" ${current === 'people' ? html`aria-current="page"` : ''}
                      >${t('footer', 'menuPeople')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.Funding}" ${current === 'funding' ? html`aria-current="page"` : ''}
                      >${t('footer', 'menuFunding')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.CodeOfConduct}" ${current === 'code-of-conduct' ? html`aria-current="page"` : ''}
                      >${t('footer', 'menuCodeOfConduct')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.EdiaStatement}" ${current === 'edia-statement' ? html`aria-current="page"` : ''}
                      >${t('footer', 'menuEdiaStatement')()}</a
                    >
                  </li>
                  <li>
                    <a href="${Routes.PrivacyPolicy}" ${current === 'privacy-policy' ? html`aria-current="page"` : ''}
                      >${t('footer', 'menuPrivacyPolicy')()}</a
                    >
                  </li>
                  <li><a href="https://content.prereview.org/">${t('footer', 'menuBlog')()}</a></li>
                  <li>
                    <a href="${Routes.HowToUse}" ${current === 'how-to-use' ? html`aria-current="page"` : ''}
                      >${t('footer', 'menuHowToUse')()}</a
                    >
                  </li>
                </ul>

                <ul class="contacts" aria-label="${t('footer', 'contactHeading')()}">
                  <li>
                    <a
                      href="mailto:contact@prereview.org"
                      class="email"
                      aria-label="${t('footer', 'contactEmail')({ address: 'contact@prereview.org' })}"
                      ><span translate="no">contact@prereview.org</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://bsky.app/profile/prereview.bsky.social"
                      class="bluesky"
                      aria-label="${t('footer', 'contactBluesky')({ handle: '@prereview.bsky.social' })}"
                      ><span translate="no">@prereview.bsky.social</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://mas.to/@prereview"
                      class="mastodon"
                      aria-label="${t('footer', 'contactMastodon')({ handle: '@prereview@mas.to' })}"
                      ><span translate="no">@prereview@mas.to</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/@Prereview"
                      class="youtube"
                      aria-label="${t('footer', 'contactYouTube')({ handle: '@Prereview' })}"
                      ><span translate="no">@Prereview</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://www.linkedin.com/company/prereview/"
                      class="linked-in"
                      aria-label="${t('footer', 'contactLinkedIn')({ handle: 'PREreview' })}"
                      ><span translate="no">PREreview</span></a
                    >
                  </li>
                  <li>
                    <a
                      href="https://github.com/PREreview"
                      class="github"
                      aria-label="${t('footer', 'contactGitHub')({ handle: 'PREreview' })}"
                      ><span translate="no">PREreview</span></a
                    >
                  </li>
                </ul>

                <div class="small">
                  ${rawHtml(
                    t(
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
              t(
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
