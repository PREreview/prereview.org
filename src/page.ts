import { Array, HashMap, String, Tuple, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, type PlainText, html, rawHtml } from './html.js'
import { DefaultLocale, type SupportedLocale, UserSelectableLocales, translate } from './locales/index.js'
import assets from './manifest.json' with { type: 'json' }
import type * as Router from './Router/index.js'
import * as Routes from './routes.js'
import {
  homeMatch,
  logInMatch,
  logOutMatch,
  myDetailsMatch,
  myPrereviewsMatch,
  partnersMatch,
  reviewRequestsMatch,
  reviewsMatch,
} from './routes.js'
import type { UserOnboarding } from './user-onboarding.js'
import type { User } from './user.js'

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
  readonly js?: ReadonlyArray<Exclude<Assets<'.js'>, 'collapsible-menu.js' | 'expander-button.js' | 'skip-link.js'>>
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
  canChooseLocale,
  useCrowdinInContext,
  canSeeDesignTweaks = false,
}: {
  page: Page
  environmentLabel?: 'dev' | 'sandbox'
  fathomId?: string
  publicUrl: URL
  canChooseLocale?: boolean
  useCrowdinInContext: boolean
  canSeeDesignTweaks?: boolean
}): Html => {
  const scripts = pipe(
    Array.dedupe(js),
    Array.appendAll(skipLinks.length > 0 ? ['skip-link.js' as const] : []),
    Array.appendAll(type !== 'streamline' ? ['collapsible-menu.js' as const] : []),
    Array.appendAll(canSeeDesignTweaks ? ['expander-button.js' as const] : []),
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
      <body ${rawHtml(`class="${canSeeDesignTweaks ? 'tweaked' : 'untweaked'}${type === 'two-up' ? ` ${type}` : ''}"`)}>
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
            ${(user || type !== 'streamline') && !canSeeDesignTweaks
              ? html`
                  <nav>
                    <ul>
                      ${type !== 'streamline'
                        ? html`
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

          ${canSeeDesignTweaks
            ? html`
                <nav>
                  <div class="header">
                    <div class="logo">
                      <a
                        href="${format(homeMatch.formatter, {})}"
                        ${current === 'home' ? html`aria-current="page"` : ''}
                      >
                        <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                      </a>
                    </div>

                    <expander-button>
                      <a href="${Routes.Menu}" ${current === 'menu' ? html`aria-current="page"` : ''}>Menu</a>
                      <button aria-controls="navigation" aria-expanded="false" hidden><span>Menu</span></button>
                    </expander-button>
                    ${pageUrls
                      ? html`
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
                        `
                      : ''}
                  </div>

                  <div id="navigation" class="menu" hidden>
                    <div>
                      <h3>Get involved</h3>
                      <ul>
                        <li>
                          <a href="${format(Routes.reviewsMatch.formatter, {})}"
                            >${translate(locale, 'header', 'menuReviews')()}</a
                          >
                          <p>See preprints with a PREreview.</p>
                        </li>
                        <li>
                          <a href="${format(Routes.reviewRequestsMatch.formatter, {})}"
                            >${translate(locale, 'header', 'menuRequests')()}</a
                          >
                          <p>Help an author by reviewing their preprint.</p>
                        </li>
                        <li>
                          <a href="${Routes.Clubs}">${translate(locale, 'header', 'menuClubs')()}</a>
                          <p>Connect with like-minded peers.</p>
                        </li>
                        <li>
                          <a href="${Routes.Trainings}">${translate(locale, 'header', 'menuTrainings')()}</a>
                          <p>Learn about ethical and constructive peer review.</p>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3>Find out more</h3>
                      <ul>
                        <li>
                          <a href="https://content.prereview.org/">${translate(locale, 'header', 'menuBlog')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.AboutUs}">${translate(locale, 'header', 'menuAboutUs')()}</a>
                        </li>
                        <li>
                          <a href="${format(Routes.partnersMatch.formatter, {})}"
                            >${translate(locale, 'header', 'menuPartners')()}</a
                          >
                        </li>
                        <li>
                          <a href="https://donorbox.org/prereview">${translate(locale, 'header', 'menuDonate')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.LiveReviews}">${translate(locale, 'header', 'menuLiveReviews')()}</a>
                        </li>
                        <li>
                          <a href="${Routes.Resources}">${translate(locale, 'header', 'menuResources')()}</a>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3>My account</h3>
                      <ul>
                        ${user
                          ? html` <li>
                                <a href="${format(Routes.myDetailsMatch.formatter, {})}"
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
                                <a href="${format(Routes.myPrereviewsMatch.formatter, {})}"
                                  >${translate(locale, 'header', 'menuMyPrereviews')()}</a
                                >
                              </li>
                              <li>
                                <a href="${format(Routes.logOutMatch.formatter, {})}"
                                  >${translate(locale, 'header', 'menuLogOut')()}</a
                                >
                              </li>`
                          : html` <li>
                              <a href="${format(Routes.logInMatch.formatter, {})}"
                                >${translate(locale, 'header', 'menuLogIn')()}</a
                              >
                            </li>`}
                      </ul>
                    </div>
                  </div>
                </nav>
              `
            : html`
                <div class="header">
                  <div class="logo">
                    <a href="${format(homeMatch.formatter, {})}" ${current === 'home' ? html`aria-current="page"` : ''}>
                      <img src="${assets['prereview.svg']}" width="570" height="147" alt="PREreview" />
                    </a>
                  </div>

                  ${type !== 'streamline'
                    ? html` <collapsible-menu>
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
                              <a href="${Routes.Trainings}" ${current === 'trainings' ? html`aria-current="page"` : ''}
                                >${translate(locale, 'header', 'menuTrainings')()}</a
                              >
                            </li>
                            <li>
                              <a
                                href="${Routes.LiveReviews}"
                                ${current === 'live-reviews' ? html`aria-current="page"` : ''}
                                >${translate(locale, 'header', 'menuLiveReviews')()}</a
                              >
                            </li>
                            <li>
                              <a href="${Routes.Resources}" ${current === 'resources' ? html`aria-current="page"` : ''}
                                >${translate(locale, 'header', 'menuResources')()}</a
                              >
                            </li>
                            <li>
                              <a href="${Routes.Clubs}" ${current === 'clubs' ? html`aria-current="page"` : ''}
                                >${translate(locale, 'header', 'menuClubs')()}</a
                              >
                            </li>
                          </ul>
                        </nav>
                      </collapsible-menu>`
                    : ''}
                </div>
              `}
        </header>

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
                        <span>${translate(locale, 'footer', 'chooseLanguage')()}</span>

                        ${pageUrls
                          ? html`
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
                            `
                          : html`
                              <locale-picker>
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
                                            href="#"
                                            lang="${code}"
                                            hreflang="${code}"
                                            data-locale="${code}"
                                            ${locale === code ? html`aria-current="true"` : ''}
                                            >${name}</a
                                          >
                                        </li>
                                      `,
                                    ),
                                  )}
                                </ul>
                              </locale-picker>
                            `}
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

                <ul aria-label="Support links">
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
                          'contactBluesky',
                        )({
                          handle:
                            html`</span><a href="https://bsky.app/profile/prereview.bsky.social" class="bluesky" translate="no"
                            >@prereview.bsky.social</a
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
